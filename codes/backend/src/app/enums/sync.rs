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
}

impl SyncMethod {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Get => "get",
            Self::Post => "post",
        }
    }

    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "get" => Some(Self::Get),
            "post" => Some(Self::Post),
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
    use super::{SyncKind, SyncMethod, SyncStatus};

    #[test]
    fn words_round_trip() {
        for kind in SyncKind::ALL {
            assert_eq!(SyncKind::parse(kind.as_str()), Some(kind));
            assert_eq!(serde_json::to_value(kind).ok().and_then(|value| value.as_str().map(str::to_owned)).as_deref(), Some(kind.as_str()));
        }
        assert_eq!(SyncMethod::parse("post"), Some(SyncMethod::Post));
        assert_eq!(SyncStatus::parse("ok"), Some(SyncStatus::Ok));
        assert!(SyncKind::parse("nope").is_none());
    }
}
