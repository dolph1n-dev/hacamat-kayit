// Compatibility exports. All collection reads/writes use the same queue and
// transaction recovery; errors propagate to callers instead of being swallowed.
import { getAppointmentState, mutateAppointmentState } from './appointmentStorage';
export const getRecords = async () => (await getAppointmentState()).records;
export const getAppointments = async () => (await getAppointmentState()).appointments;
export const saveRecords = records => mutateAppointmentState(state => ({ ...state, records }));
export const saveAppointments = appointments => mutateAppointmentState(state => ({ ...state, appointments }));
