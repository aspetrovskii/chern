import { getInitials, getStoredAvatarDataUrl } from "../../lib/userProfile";
import headerStyles from "./Header.module.css";

type UserAvatarProps = {
  login: string;
  email: string;
  size?: number;
  className?: string;
};

export function UserAvatar({ login, email, size = 28, className }: UserAvatarProps) {
  const url = getStoredAvatarDataUrl();
  const initials = getInitials(login, email);
  const dim = { width: size, height: size };

  if (url) {
    return (
      <img
        className={`${headerStyles["user-avatar-img"]} ${className ?? ""}`}
        src={url}
        alt=""
        decoding="async"
        {...dim}
      />
    );
  }

  return (
    <span
      className={`${headerStyles["user-avatar-fallback"]} ${className ?? ""}`}
      style={dim}
      aria-hidden
    >
      {initials}
    </span>
  );
}
