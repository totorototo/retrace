// A model as one line: "7:30/km flat · fatigue 0.003 · 1h00 at each LifeBase".
export function modelText(settings) {
  if (!settings) return null;
  const pace = Math.round(settings.pace_base_s_per_km);
  const paceText = `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}/km flat`;
  const stopMin = Math.round(settings.life_base_stop_s / 60);
  const stopText =
    stopMin === 0
      ? "no stop at LifeBases"
      : `${Math.floor(stopMin / 60)}h${String(stopMin % 60).padStart(2, "0")} at each LifeBase`;
  return `${paceText} · fatigue ${settings.fatigue_coefficient} · ${stopText}`;
}
