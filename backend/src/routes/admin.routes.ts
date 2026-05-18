import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { CourseController } from '../controllers/CourseController';
import { AcademicRecordController } from '../controllers/AcademicRecordController';
import { TrajectoryController } from '../controllers/TrajectoryController';
import { EducationalProgramController } from '../controllers/EducationalProgramController';
import { GroupController } from '../controllers/GroupController';
import { SettingsController } from '../controllers/SettingsController';

import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

import { createUserSchema, updateUserSchema, blockUserSchema } from '../validators/admin.validator';
import { rejectTrajectorySchema, forceSubmitTrajectorySchema } from '../validators/trajectory.validator';
import { createCourseSchema, updateCourseSchema, addDependencySchema } from '../validators/course.validator';
import { createRecordSchema, updateRecordSchema } from '../validators/academic-record.validator';
import { createProgramSchema, updateProgramSchema, importProgramsSchema } from '../validators/educational-program.validator';
import { createGroupSchema, updateGroupSchema, importGroupsSchema } from '../validators/group.validator';
import { updateGlobalSettingsSchema } from '../validators/settings.validator';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));


router.get('/students', UserController.listStudents);
router.get('/admins', UserController.listAdmins);
router.get('/students/groups', AcademicRecordController.getGroups);
router.post('/users', validate(createUserSchema), UserController.createUser);
router.put('/users/:id', validate(updateUserSchema), UserController.updateUserProfile);
router.post('/students/import', upload.single('file'), UserController.importStudents);
router.patch('/users/:id/block', validate(blockUserSchema), UserController.blockUser);
router.delete('/users/:id', UserController.deleteUser);


router.get('/trajectories', TrajectoryController.listTrajectories);
router.patch('/trajectories/:id/approve', TrajectoryController.approveTrajectory);
router.patch('/trajectories/:id/reject', validate(rejectTrajectorySchema), TrajectoryController.rejectTrajectory);
router.post('/trajectories/force', validate(forceSubmitTrajectorySchema), TrajectoryController.forceSubmitTrajectory);
router.delete('/trajectories/:id', TrajectoryController.deleteTrajectory);


router.get('/courses', CourseController.getCourses);
router.post('/courses', validate(createCourseSchema), CourseController.createCourse);
router.put('/courses/:id', validate(updateCourseSchema), CourseController.updateCourse);
router.delete('/courses/:id', CourseController.deleteCourse);
router.post('/courses/import', upload.single('file'), CourseController.importCourses);
router.post('/courses/dependencies', validate(addDependencySchema), CourseController.addDependency);
router.delete('/courses/dependencies/:id', CourseController.removeDependency);


router.get('/records', AcademicRecordController.getAcademicRecords);
router.post('/records', validate(createRecordSchema), AcademicRecordController.addAcademicRecord);
router.put('/records/:id', validate(updateRecordSchema), AcademicRecordController.updateAcademicRecord);
router.delete('/records/:id', AcademicRecordController.deleteAcademicRecord);
router.post('/records/bulk', upload.single('file'), AcademicRecordController.bulkUploadRecords);


router.get('/educational-programs', EducationalProgramController.listEducationalPrograms);
router.post('/educational-programs', validate(createProgramSchema), EducationalProgramController.createEducationalProgram);
router.put('/educational-programs/:id', validate(updateProgramSchema), EducationalProgramController.updateEducationalProgram);
router.delete('/educational-programs/:id', EducationalProgramController.deleteEducationalProgram);
router.post('/educational-programs/import', upload.single('file'), EducationalProgramController.importEducationalPrograms);


router.get('/groups', GroupController.listGroups);
router.post('/groups', validate(createGroupSchema), GroupController.createGroup);
router.put('/groups/:id', validate(updateGroupSchema), GroupController.updateGroup);
router.delete('/groups/:id', GroupController.deleteGroup);
router.post('/groups/import', upload.single('file'), GroupController.importGroups);


router.get('/global-settings', SettingsController.getGlobalSettings);
router.put('/global-settings', validate(updateGlobalSettingsSchema), SettingsController.updateGlobalSettings);

export default router;
