//! The review workflow: a rule is cited by its own source or by its condition's sources; a condition ships only when a
//! person reviewed it and no rule of it changed since. Pure functions over the catalog snapshot.
use crate::app::models::{condition, food_rule};
use crate::app::repositories::CatalogSnapshot;

/// Why a condition may not ship (or be marked reviewed) yet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Blocker {
    /// rules with no source of their own while the condition has no sources either
    Uncited(usize),
    /// rules edited, or never reviewed, since the condition was last reviewed
    Unreviewed(usize),
    /// no medical reviewer has marked the condition
    NotReviewed,
}

impl Blocker {
    pub fn message(self) -> String {
        match self {
            Self::Uncited(count) => format!("{count} rules have no source: cite one first"),
            Self::Unreviewed(count) => format!("{count} rules are not reviewed: a medical reviewer marks them first"),
            Self::NotReviewed => "a medical reviewer has to review this condition first".to_owned(),
        }
    }
}

pub fn rules_of<'snapshot>(snapshot: &'snapshot CatalogSnapshot, condition_id: i32) -> impl Iterator<Item = &'snapshot food_rule::Model> {
    snapshot.rules.iter().filter(move |rule| rule.condition_id == condition_id)
}

/// Does the condition carry sources of its own (shown under its page)?
pub fn has_sources(snapshot: &CatalogSnapshot, condition_id: i32) -> bool {
    snapshot.source_links.iter().any(|link| link.condition_id == Some(condition_id))
}

/// Rules that cite nothing: no source of their own and none on the condition.
pub fn uncited(snapshot: &CatalogSnapshot, condition_id: i32) -> usize {
    if has_sources(snapshot, condition_id) {
        return 0;
    }
    rules_of(snapshot, condition_id).filter(|rule| rule.source_id.is_none()).count()
}

pub fn unreviewed(snapshot: &CatalogSnapshot, condition_id: i32) -> usize {
    rules_of(snapshot, condition_id).filter(|rule| rule.reviewed_on.is_none()).count()
}

/// Can a reviewer mark this condition reviewed? (Every rule cited.)
pub fn can_review(snapshot: &CatalogSnapshot, item: &condition::Model) -> Result<(), Blocker> {
    match uncited(snapshot, item.id) {
        0 => Ok(()),
        count => Err(Blocker::Uncited(count)),
    }
}

/// May the condition go live? Reviewed, with every rule reviewed after its last edit.
pub fn can_ship(snapshot: &CatalogSnapshot, item: &condition::Model) -> Result<(), Blocker> {
    if item.reviewed_on.is_none() {
        return Err(Blocker::NotReviewed);
    }
    match unreviewed(snapshot, item.id) {
        0 => Ok(()),
        count => Err(Blocker::Unreviewed(count)),
    }
}
