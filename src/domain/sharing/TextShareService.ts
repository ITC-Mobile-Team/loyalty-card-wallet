export type ShareTextInput = {
  message: string;
  title: string;
};

export type TextShareService = {
  shareText(input: ShareTextInput): Promise<boolean>;
};
