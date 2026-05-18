type MeetingTranscriptUploadFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export function MeetingTranscriptUploadForm({ action }: MeetingTranscriptUploadFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Meeting title</span>
          <input
            name="title"
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="USFS access coordination call"
            type="text"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Meeting date</span>
          <input
            name="meeting_date"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            type="date"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">Participants</span>
          <input
            name="participants"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="Thomas, Dave Gorman / MVE, USFS representative"
            type="text"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">Source</span>
          <input
            name="source"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="Zoom upload, Teams export, recorder file"
            type="text"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Audio upload</span>
        <input
          name="audio_file"
          accept="audio/*,.m4a,.mp3,.wav,.mp4"
          className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          type="file"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Transcript file upload</span>
        <input
          name="transcript_file"
          accept=".txt,.md,.doc,.docx,.pdf"
          className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          type="file"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Transcript text</span>
        <textarea
          name="transcript_text"
          rows={8}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          placeholder="Paste transcript text here if you already have it."
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
        <textarea
          name="notes"
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          placeholder="Meeting context, key decisions, action items, or follow-up notes."
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Upload meeting transcript
      </button>
    </form>
  );
}
