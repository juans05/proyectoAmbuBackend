export const SocketEvents = {
  // Client to Server
  UPDATE_LOCATION: 'update_location',
  JOIN_EMERGENCY: 'join_emergency',
  LEAVE_EMERGENCY: 'leave_emergency',

  // Server to Client
  EMERGENCY_ASSIGNED: 'emergency_assigned',
  AMBULANCE_LOCATION: 'ambulance_location',
  STATUS_CHANGE: 'status_change',
  NO_AMBULANCE: 'no_ambulance_available',
  NEW_EMERGENCY: 'new_emergency',
};
