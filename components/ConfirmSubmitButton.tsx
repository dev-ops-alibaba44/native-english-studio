"use client";

// A plain submit button that first shows a native browser confirm()
// dialog (a real pop-up with OK/Cancel) before letting the form actually
// submit. Kept deliberately simple — intercepting the click with
// preventDefault() when the person cancels is enough to stop the whole
// form submission, no client-side form state or extra wiring needed, so
// the page around it can stay a server component.
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
