import { motion } from "framer-motion";

/** Selo de carimbo: comemoração discreta (ex.: sequência de dias). */
export function Seal({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, rotate: 4 }}
      animate={{ opacity: 1, scale: 1, rotate: -7 }}
      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.3 }}
      className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-primary/45 text-brand"
    >
      <span className="absolute inset-[3px] rounded-full border border-dashed border-primary/25" />
      <span className="text-center leading-none">
        <span className="figure block text-xl font-semibold">{value}</span>
        <span className="mt-0.5 block text-[7.5px] uppercase tracking-[0.16em]">
          {label}
        </span>
      </span>
    </motion.div>
  );
}
