export type InteractionFeedback = {
  error(): void;
  selectionChanged(): void;
  success(): void;
  warning(): void;
};
