import express from 'express';
import { register, login, forgotPassword, verifyOtpAndResetPassword, updateProfile, updateAvatar, deactivateAccount, listUsers, confirmAppointment, listAppointments, getAppointmentById, approveAppointment } from '../controllers/user.controller.js';

const router=express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/initiate-forgot-password').post(forgotPassword)
router.route('/verify-otp-generate-password').post(verifyOtpAndResetPassword)
router.route('/update-profile').post(updateProfile)
router.route("/update-avatar").patch(updateAvatar);
router.route("/deactivate-account").patch(deactivateAccount);
router.route("/list-users").get(listUsers)

router.route('/appointment-confirmation').post(confirmAppointment)
router.route('/appointments').get(listAppointments)
router.route('/appointment/:id').get(getAppointmentById);
router.route('/appointment-approve/:id').patch(approveAppointment);


export default router;