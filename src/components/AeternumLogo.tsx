import logo from "@/assets/aeternum-logo.jpg";

export function AeternumLogo({ size = 96, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div
      className={`rounded-full overflow-hidden ${glow ? "gold-glow" : ""}`}
      style={{ width: size, height: size, border: "2px solid oklch(0.72 0.13 50 / 0.7)" }}
    >
      <img src={logo} alt="ÆTERNUM Peptides" className="w-full h-full object-cover" />
    </div>
  );
}
