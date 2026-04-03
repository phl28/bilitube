export { default as db, initDatabase } from './client';
export {
  getVideoMatch,
  getVideoMatchByBilibiliId,
  saveVideoMatch,
  addAdminCorrection,
  getAdminCorrections,
  addBilibiliReupload,
  removeBilibiliReupload,
  getCommentTranslation,
  saveCommentTranslation,
} from './queries';
