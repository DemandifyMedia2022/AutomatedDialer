import { Router } from 'express';
import * as organizationController from '../../controllers/superadmin/organizationController';

const router = Router();

// Organization CRUD operations
router.get('/list', organizationController.getOrganizationsList);
router.get('/', organizationController.getOrganizations);
router.get('/:id', organizationController.getOrganizationById);
router.post('/', organizationController.createOrganization);
router.put('/:id', organizationController.updateOrganization);
router.delete('/:id', organizationController.deleteOrganization);

export default router;