import { useState, type ComponentProps } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import "./SelectField.css";

interface Props extends Pick<
  ComponentProps<typeof Select.Trigger>,
  "id" | "aria-label" | "aria-invalid" | "aria-describedby"
> {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function SelectField({
  value,
  onValueChange,
  options,
  name,
  placeholder = "선택해 주세요",
  disabled,
  compact = false,
  ...attributes
}: Props) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  // Native modal dialogs make body portals inert. Keep the menu in its dialog.
  const container = trigger?.closest("dialog") ?? undefined;
  const selected = options.some((option) => option.value === value)
    ? value
    : "";

  return (
    <Select.Root
      value={selected}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={setOpen}
      name={name}
      disabled={disabled || options.length === 0}
    >
      <Select.Trigger
        {...attributes}
        ref={setTrigger}
        className={`select-trigger${compact ? " select-trigger-compact" : ""}`}
      >
        <span className="select-value">
          <Select.Value
            placeholder={options.length ? placeholder : "선택할 항목이 없어요"}
          />
        </span>
        <Select.Icon className="select-chevron">
          <ChevronDown size={16} strokeWidth={1.7} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={container}>
        <Select.Content
          className="select-content"
          position="popper"
          sideOffset={6}
          align={compact ? "end" : "start"}
          collisionPadding={12}
          onEscapeKeyDown={(event) => {
            // One Escape closes the menu, without cancelling the parent form.
            event.preventDefault();
            setOpen(false);
          }}
        >
          <Select.ScrollUpButton className="select-scroll">
            <ChevronUp size={14} />
          </Select.ScrollUpButton>
          <Select.Viewport className="select-viewport">
            {options.map((option) => (
              <Select.Item
                className="select-option"
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                textValue={option.label}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="select-check">
                  <Check size={15} strokeWidth={2} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="select-scroll">
            <ChevronDown size={14} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
