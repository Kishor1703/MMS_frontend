import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

const profilePhotoUrl = (photo) => (photo ? new URL(photo, apiClient.defaults.baseURL).href : "");

export default function Profile() {
  const { user } = useAuth();
  const role = user?.role?.replaceAll("_", " ") || "Employee";

  return (
    <section className="employee-profile-page">
      {user?.profilePhoto && (
        <img className="employee-profile-photo" src={profilePhotoUrl(user.profilePhoto)} alt={`${user.name}'s profile`} />
      )}
      <div>
        <h1>{user?.name}</h1>
        <p className="employee-role">{role}</p>
        <p className="muted">{user?.email}</p>
      </div>
    </section>
  );
}
