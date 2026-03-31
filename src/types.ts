export type Category = "PC" | "Notebook" | "Smartphone" | "Console" | "Outros";

export interface PCComponents {
  processor: string;
  memory: string;
  motherboard: string;
  powerSupply: string;
  storage: string;
  case: string;
  gpu?: string;
  cooling?: string;
}

export interface QuoteData {
  date: string;
  clientName: string;
  clientPhone?: string;
  category: Category;
  description: string;
  pcComponents?: PCComponents;
  price: number;
  interestRate: number;
  installments: number;
  paymentTerms: string;
  validityDays: number;
  notes?: string;
}
