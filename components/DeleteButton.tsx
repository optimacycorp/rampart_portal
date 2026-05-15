type DeleteButtonProps = {
  label: string;
};

export function DeleteButton({ label }: DeleteButtonProps) {
  return (
    <button
      type="submit"
      className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200"
    >
      {label}
    </button>
  );
}
