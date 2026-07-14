import { apiFetch } from '../mockApi';
import { AppNotification } from '../types';

export async function createNotification(
  token: string,
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
) {
  try {
    await apiFetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(notification)
    });
  } catch (err) {
    console.error('Failed to create notification', err);
  }
}

export async function fetchNotifications(token: string): Promise<AppNotification[]> {
  try {
    const res = await apiFetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.error('Failed to fetch notifications', err);
  }
  return [];
}

export async function markNotificationRead(token: string, id: string) {
  try {
    await apiFetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, read: true })
    });
  } catch (err) {
    console.error('Failed to mark notification read', err);
  }
}

export async function markAllNotificationsRead(token: string, userId: string) {
  try {
    await apiFetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ markAllRead: true, userId })
    });
  } catch (err) {
    console.error('Failed to mark all notifications read', err);
  }
}

export async function sendStatusChangeNotification(
  token: string,
  newStatus: string,
  evalId: string,
  evalData: {
    employeeId: string;
    employeeName: string;
    appraiser: string;
    supporter: string;
    position: string;
  },
  senderName: string
) {
  const evalLink = `/evaluation?id=${evalId}`;
  const baseMsg = `${evalData.employeeName} (${evalData.position})`;

  switch (newStatus) {
    case 'Waiting for Supervisor':
      if (evalData.appraiser) {
        await createNotification(token, {
          userId: evalData.appraiser,
          message: `${baseMsg} has submitted their self-evaluation. Please review.`,
          khMessage: `${baseMsg} បានដាក់ស្នើការវាយតម្លៃខ្លួនឯង។ សូមពិនិត្យមើល។`,
          type: 'action_required',
          link: evalLink,
          evaluationId: evalId,
        });
      }
      break;

    case 'Waiting for Supporter':
      if (evalData.supporter) {
        await createNotification(token, {
          userId: evalData.supporter,
          message: `Supervisor has completed their review of ${baseMsg}. Your review is now required.`,
          khMessage: `អ្នកគ្រប់គ្រងបានបញ្ចប់ការពិនិត្យ ${baseMsg}។ ឥឡូវនេះត្រូវការការពិនិត្យរបស់អ្នក។`,
          type: 'action_required',
          link: evalLink,
          evaluationId: evalId,
        });
      }
      break;

    case 'Completed':
      await createNotification(token, {
        userId: evalData.employeeId,
        message: `Your evaluation for ${evalData.position} has been completed. Overall score is ready.`,
        khMessage: `ការវាយតម្លៃរបស់អ្នកសម្រាប់ ${evalData.position} បានបញ្ចប់។ ពិន្ទុសរុបរួចរាល់។`,
        type: 'success',
        link: evalLink,
        evaluationId: evalId,
      });
      break;

    case 'Returned to Employee':
      if (evalData.employeeId) {
        await createNotification(token, {
          userId: evalData.employeeId,
          message: `Your evaluation for ${evalData.position} has been returned by ${senderName}. Please review and resubmit.`,
          khMessage: `ការវាយតម្លៃរបស់អ្នកសម្រាប់ ${evalData.position} ត្រូវបានផ្ញើត្រឡប់ដោយ ${senderName}។ សូមពិនិត្យមើលឡើងវិញ។`,
          type: 'warning',
          link: evalLink,
          evaluationId: evalId,
        });
      }
      break;
  }
}
