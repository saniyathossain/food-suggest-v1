/// Declares a closed string enum parsed from env values (`CACHE_DRIVER=redis`).
macro_rules! string_enum {
    ($name:ident { $($variant:ident => $text:literal),+ $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub enum $name { $($variant),+ }

        impl $name {
            pub const fn as_str(self) -> &'static str {
                match self { $(Self::$variant => $text),+ }
            }
        }

        impl std::str::FromStr for $name {
            type Err = String;
            fn from_str(value: &str) -> Result<Self, Self::Err> {
                match value.trim().to_ascii_lowercase().as_str() {
                    $($text => Ok(Self::$variant),)+
                    other => Err(format!("unknown {} \"{}\"", stringify!($name), other)),
                }
            }
        }
    };
}

string_enum!(AppEnv { Local => "local", Production => "production", Testing => "testing" });
string_enum!(CacheDriver { Memory => "memory", Redis => "redis", Null => "null" });
string_enum!(LogChannel { Stdout => "stdout", File => "file", Stack => "stack" });
string_enum!(LogFormat { Json => "json", Pretty => "pretty" });
string_enum!(StorageDriver { Local => "local", S3 => "s3" });
