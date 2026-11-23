//! SSRF guard for outgoing sync requests. A super admin chooses the URL, but a URL can still point inside our network (the
//! database host, the cloud metadata address, a neighbour container), so: only http(s), no credentials in the URL, and every
//! address the host name resolves to must be a public one. The caller connects to the addresses checked here (pinned), so a DNS
//! answer that changes between the check and the connection cannot slip through. `SYNC_ALLOW_PRIVATE_HOSTS=true` (development,
//! a local mock endpoint) skips only the address check.
use reqwest::Url;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

/// Why a host cannot be used.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Blocked {
    /// refused for good: wrong scheme, credentials in the URL, a private or reserved address
    Refused(String),
    /// the name did not resolve now (retrying later may help)
    Dns(String),
}

fn v4_public(address: Ipv4Addr) -> bool {
    let [first, second, third, _] = address.octets();
    !(address.is_unspecified()
        || address.is_loopback()
        || address.is_private()
        || address.is_link_local()
        || address.is_broadcast()
        || address.is_multicast()
        || first == 0
        || first >= 240
        || (first == 100 && (64..=127).contains(&second))
        || (first == 192 && second == 0 && third == 0)
        || (first == 192 && second == 0 && third == 2)
        || (first == 198 && (second == 18 || second == 19))
        || (first == 198 && second == 51 && third == 100)
        || (first == 203 && second == 0 && third == 113))
}

fn v6_public(address: Ipv6Addr) -> bool {
    let segments = address.segments();
    // ::ffff:a.b.c.d and ::a.b.c.d carry an IPv4 address: judge that one
    if let Some(inner) = address.to_ipv4() {
        return v4_public(inner);
    }
    // 64:ff9b::/96 (NAT64) and 2002::/16 (6to4) embed one too
    let embedded = |high: u16, low: u16| Ipv4Addr::new((high >> 8) as u8, (high & 0xff) as u8, (low >> 8) as u8, (low & 0xff) as u8);
    if segments[0] == 0x64 && segments[1] == 0xff9b {
        return v4_public(embedded(segments[6], segments[7]));
    }
    if segments[0] == 0x2002 {
        return v4_public(embedded(segments[1], segments[2]));
    }
    !(address.is_unspecified()
        || address.is_loopback()
        || address.is_multicast()
        || (segments[0] & 0xfe00) == 0xfc00 // unique local fc00::/7
        || (segments[0] & 0xffc0) == 0xfe80 // link local fe80::/10
        || (segments[0] & 0xffc0) == 0xfec0 // site local (deprecated)
        || (segments[0] == 0x2001 && segments[1] == 0x0db8)) // documentation
}

/// True for an address a sync may connect to: not loopback, private, link-local, shared, multicast, reserved or documentation.
pub fn address_allowed(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(inner) => v4_public(inner),
        IpAddr::V6(inner) => v6_public(inner),
    }
}

/// Every address must be allowed: one private answer among public ones refuses the host.
pub fn check_addresses(addresses: &[IpAddr], allow_private: bool) -> Result<(), Blocked> {
    if addresses.is_empty() {
        return Err(Blocked::Dns("the host name has no address".to_owned()));
    }
    if allow_private {
        return Ok(());
    }
    match addresses.iter().find(|address| !address_allowed(**address)) {
        Some(_) => Err(Blocked::Refused("the address is private or reserved, so it is not fetched".to_owned())),
        None => Ok(()),
    }
}

/// Scheme and shape: http or https, a host, no `user:password@`.
pub fn check_url(url: &Url) -> Result<(), Blocked> {
    if !matches!(url.scheme(), "http" | "https") {
        return Err(Blocked::Refused("only http and https addresses are fetched".to_owned()));
    }
    if url.host_str().is_none_or(str::is_empty) {
        return Err(Blocked::Refused("the address has no host".to_owned()));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(Blocked::Refused("put credentials in a header, not in the address".to_owned()));
    }
    Ok(())
}

/// The URL's addresses, checked. An IP literal needs no lookup; a name is resolved here and the answers are what get connected to.
pub async fn resolve(url: &Url, allow_private: bool) -> Result<Vec<SocketAddr>, Blocked> {
    check_url(url)?;
    let port = url.port_or_known_default().unwrap_or(80);
    let host = url.host_str().unwrap_or_default().trim_start_matches('[').trim_end_matches(']');
    let addresses: Vec<SocketAddr> = match host.parse::<IpAddr>() {
        Ok(address) => vec![SocketAddr::new(address, port)],
        Err(_) => tokio::net::lookup_host((host, port)).await.map_err(|error| Blocked::Dns(format!("{host} did not resolve: {error}")))?.collect(),
    };
    check_addresses(&addresses.iter().map(SocketAddr::ip).collect::<Vec<_>>(), allow_private)?;
    Ok(addresses)
}

#[cfg(test)]
mod tests {
    use super::{address_allowed, check_addresses, check_url, resolve, Blocked};
    use reqwest::Url;
    use std::net::IpAddr;

    fn ip(text: &str) -> IpAddr {
        text.parse().expect("an address")
    }

    #[test]
    fn private_and_reserved_ipv4_are_refused() {
        for text in [
            "127.0.0.1", "127.9.9.9", "0.0.0.0", "10.0.0.1", "10.255.255.255", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "169.254.0.1", "100.64.0.1", "100.127.255.255", "192.0.0.1", "192.0.2.5", "198.18.0.1",
            "198.51.100.7", "203.0.113.9", "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
        ] {
            assert!(!address_allowed(ip(text)), "{text} must be refused");
        }
    }

    #[test]
    fn public_ipv4_are_allowed() {
        for text in ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.255.255", "172.32.0.1", "100.63.255.255", "100.128.0.1", "198.17.255.255", "198.20.0.1", "192.0.1.1"] {
            assert!(address_allowed(ip(text)), "{text} must be allowed");
        }
    }

    #[test]
    fn private_and_reserved_ipv6_are_refused() {
        for text in ["::1", "::", "fe80::1", "febf::1", "fc00::1", "fd12:3456::1", "ff02::1", "fec0::1", "2001:db8::1", "::ffff:127.0.0.1", "::ffff:10.1.2.3", "::ffff:169.254.169.254", "64:ff9b::7f00:1", "2002:7f00:1::1", "2002:a9fe:a9fe::1"] {
            assert!(!address_allowed(ip(text)), "{text} must be refused");
        }
    }

    #[test]
    fn public_ipv6_are_allowed() {
        for text in ["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8", "64:ff9b::808:808"] {
            assert!(address_allowed(ip(text)), "{text} must be allowed");
        }
    }

    #[test]
    fn one_private_answer_refuses_the_whole_host() {
        let mixed = [ip("93.184.216.34"), ip("10.0.0.7")];
        assert!(matches!(check_addresses(&mixed, false), Err(Blocked::Refused(_))));
        assert!(check_addresses(&[ip("93.184.216.34"), ip("8.8.8.8")], false).is_ok());
        assert!(matches!(check_addresses(&[], false), Err(Blocked::Dns(_))));
        assert!(check_addresses(&mixed, true).is_ok(), "the development switch skips the address check");
    }

    #[test]
    fn only_plain_http_urls_pass_the_shape_check() {
        let url = |text: &str| Url::parse(text).expect("a url");
        assert!(check_url(&url("https://api.example.org/v1?x=1")).is_ok());
        assert!(check_url(&url("http://api.example.org:8080/")).is_ok());
        assert!(check_url(&url("ftp://example.org/file")).is_err());
        assert!(check_url(&url("file:///etc/passwd")).is_err());
        assert!(check_url(&url("https://user:secret@example.org/")).is_err());
        assert!(check_url(&url("https://user@example.org/")).is_err());
    }

    #[tokio::test]
    async fn literal_addresses_are_judged_without_a_lookup() {
        let url = |text: &str| Url::parse(text).expect("a url");
        assert!(matches!(resolve(&url("http://127.0.0.1:9000/x"), false).await, Err(Blocked::Refused(_))));
        assert!(matches!(resolve(&url("http://169.254.169.254/latest/meta-data"), false).await, Err(Blocked::Refused(_))));
        assert!(matches!(resolve(&url("http://[::1]/"), false).await, Err(Blocked::Refused(_))));
        assert!(matches!(resolve(&url("http://[::ffff:192.168.0.1]/"), false).await, Err(Blocked::Refused(_))));
        assert!(matches!(resolve(&url("gopher://8.8.8.8/"), false).await, Err(Blocked::Refused(_))));
        let found = resolve(&url("https://8.8.8.8/dns"), false).await.expect("a public literal passes");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].port(), 443);
        assert!(resolve(&url("http://127.0.0.1:9000/x"), true).await.is_ok());
    }
}
