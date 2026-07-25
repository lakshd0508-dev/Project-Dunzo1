const LOGO_URL = "https://customer-assets-v7afamib.emergentagent.net/job_dunzo-auth-app/artifacts/tdi9vc11_Project_Dunzo-removebg-preview.png";

// Renders the transparent PNG directly — no background wrapper.
export default function ProjectDunzoLogo({ size = 96, className = "" }) {
  return (
    <img
      src={LOGO_URL}
      alt="Project Dunzo"
      className={className}
      style={{ height: size, width: "auto", objectFit: "contain", display: "block" }}
      data-testid="project-dunzo-logo"
    />
  );
}
