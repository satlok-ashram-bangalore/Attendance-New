import { MultiSelectOption } from "@/components/ui/multi-select";

export interface IMemberInfo {
  name: string;
  age: number;
  village: string;
  taluk: string;
  district: string;
  state: string;
  mobile: string;
  whatsapp: boolean;
  notification: boolean;
  mantra: boolean;
  social_media: boolean;
  holiday: MultiSelectOption[];
  first_language: string;
  second_language?: MultiSelectOption[];
  remarks: string;
}

export interface IMemberInfoDb extends IMemberInfo {
  id: number;
  created_at: string;
  updated_at: string;
  extras: Record<string, string>;
}