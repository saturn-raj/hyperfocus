import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${wide ? 'wide' : ''}`}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          <Dialog.Title>{title}</Dialog.Title>
          {description ? (
            <Dialog.Description id="modal-description">{description}</Dialog.Description>
          ) : null}
          <Dialog.Close className="icon-button modal-close" aria-label="Close dialog">
            <X size={19} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
