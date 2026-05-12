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
import { createUserSchema } from '../validators/admin.validator';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// Students & Users
router.get('/students', UserController.listStudents);
router.get('/admins', UserController.listAdmins);
router.get('/students/groups', AcademicRecordController.getGroups);
router.post('/students', validate(createUserSchema), UserController.createUser);
router.put('/students/:id', UserController.updateUserProfile);
router.post('/students/import', upload.single('file'), UserController.importStudents);
router.patch('/users/:id/block', UserController.blockUser);
router.delete('/users/:id', UserController.deleteUser);

// Trajectories
router.get('/trajectories', TrajectoryController.listTrajectories);
router.patch('/trajectories/:id/approve', TrajectoryController.approveTrajectory);
router.patch('/trajectories/:id/reject', TrajectoryController.rejectTrajectory);
router.post('/trajectories/bulk-status', TrajectoryController.bulkUpdateTrajectories);
router.post('/trajectories/force', TrajectoryController.forceSubmitTrajectory);
router.delete('/trajectories/:id', TrajectoryController.deleteTrajectory);

// Courses
router.get('/courses', CourseController.getCourses);
router.post('/courses', CourseController.createCourse);
router.put('/courses/:id', CourseController.updateCourse);
router.delete('/courses/:id', CourseController.deleteCourse);
router.post('/courses/import', upload.single('file'), CourseController.importCourses);
router.post('/courses/dependencies', CourseController.addDependency);
router.delete('/courses/dependencies/:id', CourseController.removeDependency);

// Academic Records
router.get('/records', AcademicRecordController.getAcademicRecords);
router.post('/records', AcademicRecordController.addAcademicRecord);
router.put('/records/:id', AcademicRecordController.updateAcademicRecord);
router.delete('/records/:id', AcademicRecordController.deleteAcademicRecord);
router.post('/records/bulk', AcademicRecordController.bulkUploadRecords);

// Educational Programs
router.get('/educational-programs', EducationalProgramController.listEducationalPrograms);
router.post('/educational-programs', EducationalProgramController.createEducationalProgram);
router.put('/educational-programs/:id', EducationalProgramController.updateEducationalProgram);
router.delete('/educational-programs/:id', EducationalProgramController.deleteEducationalProgram);
router.post('/educational-programs/import', EducationalProgramController.importEducationalPrograms);

// Groups
router.get('/groups', GroupController.listGroups);
router.get('/groups/:id', GroupController.getGroup);
router.post('/groups', GroupController.createGroup);
router.put('/groups/:id', GroupController.updateGroup);
router.delete('/groups/:id', GroupController.deleteGroup);
router.post('/groups/import', GroupController.importGroups);


// Global Academic Settings
router.get('/global-settings', SettingsController.getGlobalSettings);
router.put('/global-settings', SettingsController.updateGlobalSettings);

export default router;
