//! Closed lists of the external sync framework. Stored as text (CHECK in 0052_sync_sources.sql); the same words reach the
//! admin page through the generated TypeScript types.
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// What a source's rows become. Each kind has its own mapper (services/sync/mapper.rs); `custom` has none and only counts rows.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum SyncKind {
    Medicines,
    Foods,
    Conditions,
    Allergies,
    Custom,
}

impl SyncKind {
    pub const ALL: [Self; 5] = [Self::Medicines, Self::Foods, Self::Conditions, Self::Allergies, Self::Custom];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Medicines => "medicines",
            Self::Foods => "foods",
            Self::Conditions => "conditions",
            Self::Allergies => "allergies",
            Self::Custom => "custom",
        }
    }

    pub fn parse(text: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|kind| kind.as_str() == text)
    }

    /// True when rows of this kind can be saved (a mapper exists).
    pub const fn has_mapper(self) -> bool {
        matches!(self, Self::Medicines)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum SyncMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
}

impl SyncMethod {
    pub const ALL: [Self; 5] = [Self::Get, Self::Post, Self::Put, Self::Patch, Self::Delete];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Get => "get",
            Self::Post => "post",
            Self::Put => "put",
            Self::Patch => "patch",
            Self::Delete => "delete",
        }
    }

    pub fn parse(text: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|method| method.as_str() == text)
    }

    /// True when the request may carry a body (everything but GET).
    pub const fn has_body(self) -> bool {
        !matches!(self, Self::Get)
    }

    /// PUT, PATCH and DELETE change something on the other side: redirects are never followed, and a run needs a test of the
    /// same request first (services/sync/verify.rs). GET and POST are read-style: POST is how many search APIs are asked.
    pub const fn is_write(self) -> bool {
        matches!(self, Self::Put | Self::Patch | Self::Delete)
    }
}

/// What a run does with rows that are already there: `update` adds new rows and refreshes known ones (a medicine's label);
/// `append` only adds new rows and leaves known ones as they are. Neither replaces or removes anything.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum SyncMode {
    Update,
    Append,
}

impl SyncMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Update => "update",
            Self::Append => "append",
        }
    }

    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "update" => Some(Self::Update),
            "append" => Some(Self::Append),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    Running,
    Ok,
    Failed,
}

impl SyncStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Running => "running",
            Self::Ok => "ok",
            Self::Failed => "failed",
        }
    }

    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "running" => Some(Self::Running),
            "ok" => Some(Self::Ok),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{SyncKind, SyncMethod, SyncMode, SyncStatus};

    #[test]
    fn words_round_trip() {
        for kind in SyncKind::ALL {
            assert_eq!(SyncKind::parse(kind.as_str()), Some(kind));
            assert_eq!(serde_json::to_value(kind).ok().and_then(|value| value.as_str().map(str::to_owned)).as_deref(), Some(kind.as_str()));
        }
        for method in SyncMethod::ALL {
            assert_eq!(SyncMethod::parse(method.as_str()), Some(method));
        }
        assert!(!SyncMethod::Get.has_body() && SyncMethod::Delete.has_body() && SyncMethod::Post.has_body());
        assert!(!SyncMethod::Get.is_write() && !SyncMethod::Post.is_write());
        assert!(SyncMethod::Put.is_write() && SyncMethod::Patch.is_write() && SyncMethod::Delete.is_write());
        assert_eq!(SyncMode::parse("append"), Some(SyncMode::Append));
        assert_eq!(SyncMode::parse("replace"), None);
        assert_eq!(SyncStatus::parse("ok"), Some(SyncStatus::Ok));
        assert!(SyncKind::parse("nope").is_none());
    }
}
