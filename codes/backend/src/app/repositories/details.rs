//! Writes behind the condition detail editor.
use crate::app::enums::DetailKind;
use crate::app::exceptions::AppError;
use crate::app::models::{condition, condition_detail};
use crate::app::repositories::CatalogRepository;
use crate::app::support::i18n::LocalizedText;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, TransactionTrait};

impl CatalogRepository {
    /// Replaces the lines of one part of a condition in one transaction. Returns how many lines it now has.
    pub async fn replace_details(&self, slug: &str, kind: DetailKind, items: &[LocalizedText]) -> Result<u32, AppError> {
        let found = condition::Entity::find().filter(condition::Column::Slug.eq(slug)).one(&self.db).await?.ok_or(AppError::NotFound("condition"))?;
        let transaction = self.db.begin().await?;
        condition_detail::Entity::delete_many().filter(condition_detail::Column::ConditionId.eq(found.id)).filter(condition_detail::Column::Kind.eq(kind)).exec(&transaction).await?;
        for (at, item) in items.iter().enumerate() {
            condition_detail::ActiveModel { id: NotSet, condition_id: Set(found.id), kind: Set(kind), sort: Set(i32::try_from(at).unwrap_or(i32::MAX)), text: Set(item.to_json()), source_id: Set(None) }.insert(&transaction).await?;
        }
        transaction.commit().await?;
        self.flush().await;
        Ok(u32::try_from(items.len()).unwrap_or(u32::MAX))
    }
}
