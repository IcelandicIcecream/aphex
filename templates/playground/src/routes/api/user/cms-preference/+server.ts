// Re-export user preferences handlers from cms-core
import { userPreferences } from '@aphexcms/cms-core/routes/index';
export const { GET, PATCH } = userPreferences;
