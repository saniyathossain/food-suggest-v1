//! Profile sharing: the owner lets another account read a profile. Every write proves the owner owns the profile;
//! reading what is shared with an account is three queries (shares, profiles, owners), never one per row.
use crate::app::exceptions::AppError;
use crate::app::models::{profile, profile_share, user};
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter};

/// Accounts one profile can be shared with.
pub const MAX_SHARES: u64 = 5;

pub struct ShareRepository {
    db: DatabaseConnection,
}

impl ShareRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    async fn owned(&self, owner_id: i32, profile_id: i32) -> Result<(), AppError> {
        let found = profile::Entity::find_by_id(profile_id).filter(profile::Column::UserId.eq(owner_id)).one(&self.db).await?;
        found.map(|_| ()).ok_or(AppError::NotFound("profile"))
    }

    /// The accounts a profile is shared with (owner only).
    pub async fn recipients(&self, owner_id: i32, profile_id: i32) -> Result<Vec<user::Model>, AppError> {
        self.owned(owner_id, profile_id).await?;
        let ids: Vec<i32> = profile_share::Entity::find().filter(profile_share::Column::ProfileId.eq(profile_id)).all(&self.db).await?.into_iter().map(|row| row.user_id).collect();
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        Ok(user::Entity::find().filter(user::Column::Id.is_in(ids)).all(&self.db).await?)
    }

    pub async fn add(&self, owner_id: i32, profile_id: i32, recipient_id: i32) -> Result<(), AppError> {
        self.owned(owner_id, profile_id).await?;
        if recipient_id == owner_id {
            return Err(AppError::field("email", "that is your own account"));
        }
        let held = profile_share::Entity::find().filter(profile_share::Column::ProfileId.eq(profile_id)).count(&self.db).await?;
        let already = profile_share::Entity::find_by_id((profile_id, recipient_id)).one(&self.db).await?.is_some();
        if already {
            return Ok(());
        }
        if held >= MAX_SHARES {
            return Err(AppError::field("email", "a profile can be shared with up to 5 accounts"));
        }
        profile_share::ActiveModel { profile_id: Set(profile_id), user_id: Set(recipient_id) }.insert(&self.db).await?;
        Ok(())
    }

    pub async fn remove(&self, owner_id: i32, profile_id: i32, recipient_id: i32) -> Result<(), AppError> {
        self.owned(owner_id, profile_id).await?;
        profile_share::Entity::delete_by_id((profile_id, recipient_id)).exec(&self.db).await?;
        Ok(())
    }

    /// Profiles shared with an account, each with its owner.
    pub async fn shared_with(&self, user_id: i32) -> Result<Vec<(profile::Model, user::Model)>, AppError> {
        let ids: Vec<i32> = profile_share::Entity::find().filter(profile_share::Column::UserId.eq(user_id)).all(&self.db).await?.into_iter().map(|row| row.profile_id).collect();
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let profiles = profile::Entity::find().filter(profile::Column::Id.is_in(ids)).all(&self.db).await?;
        let owner_ids: Vec<i32> = profiles.iter().map(|item| item.user_id).collect();
        let owners = user::Entity::find().filter(user::Column::Id.is_in(owner_ids)).all(&self.db).await?;
        Ok(profiles.into_iter().filter_map(|item| owners.iter().find(|owner| owner.id == item.user_id && owner.active).cloned().map(|owner| (item, owner))).collect())
    }

    /// One shared profile and its owner, only when it is shared with this account.
    pub async fn shared_one(&self, user_id: i32, profile_id: i32) -> Result<(profile::Model, user::Model), AppError> {
        self.shared_with(user_id).await?.into_iter().find(|(item, _)| item.id == profile_id).ok_or(AppError::NotFound("profile"))
    }
}
