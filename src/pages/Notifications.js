import { useEffect, useState } from "react";
import { notificationApi } from "../api/endpoints";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const load = () => notificationApi.list().then((res) => setNotifications(res.data.data));

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationApi.markRead(id);
    load();
  };

  return (
    <div>
      <h1>Notifications</h1>
      <div className="record-list">
        {notifications.map((n) => (
          <div key={n._id} className={`notification-row${n.isRead ? "" : " unread"}`}>
            <div>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            {!n.isRead && <button onClick={() => markRead(n._id)}>Mark read</button>}
          </div>
        ))}
        {notifications.length === 0 && <p>No notifications yet.</p>}
      </div>
    </div>
  );
}
