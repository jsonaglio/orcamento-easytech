import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Download, 
  Monitor, 
  Smartphone, 
  Laptop, 
  Gamepad2, 
  MoreHorizontal,
  Cpu,
  HardDrive,
  CircuitBoard,
  Zap,
  Box,
  CreditCard,
  Calendar,
  User,
  Phone,
  FileText,
  CheckCircle2,
  Copy,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GoogleGenAI } from "@google/genai";
import { cn } from "./lib/utils";

const LOGO_URL = "/Logo.png"; // Local logo in public folder
const LOGO2_URL = "/Logo 2.png"; // New horizontal logo
const BG_URL = "https://ais-pre-uwhwyivzex77gwonguyml2-121108784645.us-west1.run.app/attachment/67035677-494b-4860-9195-2633005a7674"; // Matrix Rain

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
import { Category, QuoteData, PCComponents } from "./types";

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: "PC", label: "Computador / PC", icon: Monitor },
  { id: "Notebook", label: "Notebook", icon: Laptop },
  { id: "Smartphone", label: "Celular / Smartphone", icon: Smartphone },
  { id: "Console", label: "Console / Games", icon: Gamepad2 },
  { id: "Outros", label: "Outros", icon: MoreHorizontal },
];

const INITIAL_PC_COMPONENTS: PCComponents = {
  processor: "",
  memory: "",
  motherboard: "",
  powerSupply: "",
  storage: "",
  case: "",
  gpu: "",
  cooling: "",
};

const INITIAL_QUOTE: QuoteData = {
  date: format(new Date(), "yyyy-MM-dd"),
  clientName: "",
  clientPhone: "",
  category: "PC",
  description: "",
  pcComponents: INITIAL_PC_COMPONENTS,
  price: 0,
  interestRate: 0,
  installments: 1,
  paymentTerms: "À vista via PIX ou Cartão de Crédito",
  validityDays: 7,
  notes: "",
};

export default function App() {
  const [quote, setQuote] = useState<QuoteData>(INITIAL_QUOTE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const totalPrice = quote.price * (1 + quote.interestRate / 100);
  const installmentValue = totalPrice / quote.installments;

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const file = new File([blob], "pasted-image.png", { type: blob.type });
              processImage(file);
            }
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const processImage = async (file: File) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        
        const prompt = `Extract product details from this image of a quote or product list. 
        Return ONLY a JSON object with this structure:
        {
          "clientName": "string",
          "category": "PC" | "Notebook" | "Smartphone" | "Console" | "Outros",
          "description": "string",
          "pcComponents": {
            "processor": "string",
            "memory": "string",
            "motherboard": "string",
            "powerSupply": "string",
            "storage": "string",
            "case": "string",
            "gpu": "string",
            "cooling": "string"
          },
          "price": number
        }
        If a field is not found, use empty string or 0 for price. 
        If it's a PC, fill pcComponents. Otherwise, fill description.`;

        const result = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }]
        });

        const responseText = result.text;
        const jsonMatch = responseText?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          setQuote(prev => ({
            ...prev,
            ...data,
            id: prev.id, 
            date: prev.date,
            pcComponents: data.pcComponents || prev.pcComponents
          }));
          setToastMessage("Dados extraídos com sucesso!");
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }
      };
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Erro ao transcrever imagem. Tente novamente.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleImageTranscription = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processImage(file);
    }
  };

  const handleInputChange = (field: keyof QuoteData, value: any) => {
    setQuote((prev) => ({ ...prev, [field]: value }));
  };

  const handlePCComponentChange = (field: keyof PCComponents, value: string) => {
    setQuote((prev) => ({
      ...prev,
      pcComponents: {
        ...prev.pcComponents!,
        [field]: value,
      },
    }));
  };

  const copyToClipboard = () => {
    let text = `*ORÇAMENTO EASYTECH STORE*\n\n`;
    text += `*Cliente:* ${quote.clientName || "Não informado"}\n`;
    text += `*Categoria:* ${CATEGORIES.find(c => c.id === quote.category)?.label}\n\n`;
    
    if (quote.category === "PC" && quote.pcComponents) {
      text += `*Configuração:*\n`;
      if (quote.pcComponents.processor) text += `- Processador: ${quote.pcComponents.processor}\n`;
      if (quote.pcComponents.motherboard) text += `- Placa Mãe: ${quote.pcComponents.motherboard}\n`;
      if (quote.pcComponents.memory) text += `- Memória: ${quote.pcComponents.memory}\n`;
      if (quote.pcComponents.storage) text += `- Armazenamento: ${quote.pcComponents.storage}\n`;
      if (quote.pcComponents.gpu) text += `- Placa de Vídeo: ${quote.pcComponents.gpu}\n`;
      if (quote.pcComponents.powerSupply) text += `- Fonte: ${quote.pcComponents.powerSupply}\n`;
    } else {
      text += `*Descrição:* ${quote.description || "N/A"}\n`;
    }
    
    text += `\n*Valor à Vista:* R$ ${quote.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    if (quote.interestRate > 0) {
      text += `*Taxa de Juros:* ${quote.interestRate}%\n`;
    }
    text += `*Valor Total:* R$ ${totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    if (quote.installments > 1) {
      text += `*Parcelamento:* ${quote.installments}x de R$ ${installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    }
    text += `*Pagamento:* ${quote.paymentTerms}\n`;
    text += `*Validade:* ${quote.validityDays} dias\n\n`;
    text += `_Gerado via EasyTech Quote App_`;

    navigator.clipboard.writeText(text);
    setToastMessage("Resumo copiado para o WhatsApp!");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const primaryColor = [10, 10, 10]; // Near Black
      const accentColor = [34, 197, 94]; // EasyTech Green
      const darkGray = [20, 20, 20];
      const lightGray = [40, 40, 40];

      // Full Page Background
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 297, "F");

      // Matrix Background Pattern (Subtle)
      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.addImage(BG_URL, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      } catch (e) {
        console.warn("Could not add background pattern", e);
      }

      // Header Gradient/Bar
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, 210, 50, "F");
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.5);
      doc.line(0, 50, 210, 50);
      
      // Logo
      try {
        doc.addImage(LOGO_URL, "PNG", 15, 5, 45, 45);
      } catch (e) {
        console.warn("Could not add logo", e);
      }
      
      // Logo 2 (Horizontal)
      try {
        doc.addImage(LOGO2_URL, "PNG", 65, 12, 110, 30);
      } catch (e) {
        console.warn("Could not add logo 2", e);
      }
      
      // Date
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFontSize(10);
      doc.text(format(new Date(quote.date), "dd/MM/yyyy"), 195, 26, { align: "right" });

      // Client Info Bar
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(0, 55, 210, 15, "F");
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.text("CLIENTE", 15, 61);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(quote.clientName.toUpperCase() || "NÃO INFORMADO", 15, 66);
      
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("TELEFONE", 110, 61);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(quote.clientPhone || "NÃO INFORMADO", 110, 66);

      let currentY = 85;

      if (quote.category === "PC" && quote.pcComponents) {
        const components = [
          { label: "PROCESSADOR", value: quote.pcComponents.processor },
          { label: "MEMÓRIA RAM", value: quote.pcComponents.memory },
          { label: "PLACA MÃE", value: quote.pcComponents.motherboard },
          { label: "PLACA DE VÍDEO", value: quote.pcComponents.gpu || "INTEGRADA" },
          { label: "FONTE REAL", value: quote.pcComponents.powerSupply },
          { label: "GABINETE GAMER", value: quote.pcComponents.case },
          { label: "ARMAZENAMENTO", value: quote.pcComponents.storage },
        ].filter(item => item.value);

        components.forEach((comp, idx) => {
          // Item Box
          doc.setDrawColor(40, 40, 40);
          doc.setLineWidth(0.1);
          doc.line(15, currentY + 12, 195, currentY + 12);

          // Icon Drawing
          doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.setLineWidth(0.2);
          doc.roundedRect(15, currentY - 5, 12, 12, 2, 2, "D");
          
          // Simple Icons based on label
          const iconX = 15;
          const iconY = currentY - 5;
          if (comp.label.includes("PROCESSADOR")) {
            doc.rect(iconX + 3, iconY + 3, 6, 6);
            doc.line(iconX + 4, iconY + 2, iconX + 4, iconY + 3);
            doc.line(iconX + 6, iconY + 2, iconX + 6, iconY + 3);
            doc.line(iconX + 8, iconY + 2, iconX + 8, iconY + 3);
            doc.line(iconX + 4, iconY + 9, iconX + 4, iconY + 10);
            doc.line(iconX + 6, iconY + 9, iconX + 6, iconY + 10);
            doc.line(iconX + 8, iconY + 9, iconX + 8, iconY + 10);
          } else if (comp.label.includes("MEMÓRIA")) {
            doc.rect(iconX + 2, iconY + 4, 8, 4);
            doc.line(iconX + 3, iconY + 4, iconX + 3, iconY + 8);
            doc.line(iconX + 5, iconY + 4, iconX + 5, iconY + 8);
            doc.line(iconX + 7, iconY + 4, iconX + 7, iconY + 8);
          } else if (comp.label.includes("PLACA MÃE")) {
            doc.rect(iconX + 3, iconY + 3, 6, 6);
            doc.circle(iconX + 6, iconY + 6, 1.5);
          } else if (comp.label.includes("VÍDEO")) {
            doc.rect(iconX + 2, iconY + 4, 8, 4);
            doc.circle(iconX + 4, iconY + 6, 1.5);
            doc.circle(iconX + 8, iconY + 6, 1.5);
          } else if (comp.label.includes("FONTE")) {
            doc.rect(iconX + 3, iconY + 3, 6, 6);
            doc.line(iconX + 4, iconY + 4, iconX + 8, iconY + 8);
            doc.line(iconX + 8, iconY + 4, iconX + 4, iconY + 8);
          } else if (comp.label.includes("GABINETE")) {
            doc.rect(iconX + 4, iconY + 2, 4, 8);
          } else if (comp.label.includes("ARMAZENAMENTO")) {
            doc.ellipse(iconX + 6, iconY + 4, 3, 1.5);
            doc.line(iconX + 3, iconY + 4, iconX + 3, iconY + 8);
            doc.line(iconX + 9, iconY + 4, iconX + 9, iconY + 8);
            doc.ellipse(iconX + 6, iconY + 8, 3, 1.5);
          }

          doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(comp.label, 32, currentY);
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(comp.value.toUpperCase(), 32, currentY + 6);
          
          currentY += 18;
          
          if (currentY > 250) {
            doc.addPage();
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, 210, 297, "F");
            currentY = 30;
          }
        });
      } else {
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("DESCRIÇÃO DO PRODUTO", 15, currentY);
        currentY += 8;
        
        doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
        const splitDescription = doc.splitTextToSize(quote.description || "Nenhuma descrição fornecida.", 180);
        doc.roundedRect(15, currentY - 5, 180, (splitDescription.length * 6) + 10, 3, 3, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(splitDescription, 20, currentY + 2);
        currentY += (splitDescription.length * 6) + 20;
      }

      // Totals Section
      currentY = Math.max(currentY, 220);
      
      // Price Pill
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(15, currentY, 180, 15, 7.5, 7.5, "F");
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("VALOR À VISTA", 25, currentY + 9.5);
      
      doc.setFontSize(14);
      doc.text(`R$ ${quote.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 190, currentY + 9.5, { align: "right" });
      
      currentY += 20;
      
      if (quote.installments > 1) {
        doc.setDrawColor(40, 40, 40);
        doc.line(15, currentY - 2, 195, currentY - 2);
        
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setFontSize(9);
        doc.text(`PARCELAMENTO NO CARTÃO`, 15, currentY + 5);
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text(`${quote.installments}X DE R$ ${installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 195, currentY + 5, { align: "right" });
      }

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 35, 195, pageHeight - 35);
      
      try {
        doc.addImage(LOGO_URL, "PNG", 15, pageHeight - 30, 15, 15);
      } catch (e) {}

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("EASYTECH STORE", 35, pageHeight - 25);
      
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFontSize(7);
      doc.text("INSTAGRAM: @EASYTECHSTORERS", 35, pageHeight - 20);
      doc.text("WHATSAPP: (54) 99137-0566", 35, pageHeight - 16);
      
      const validityDate = format(addDays(new Date(quote.date), quote.validityDays), "dd/MM/yyyy");
      doc.setTextColor(100, 100, 100);
      doc.text(`VALIDADE DO ORÇAMENTO: ${validityDate}`, 195, pageHeight - 20, { align: "right" });

      doc.save(`Orcamento_${quote.clientName.replace(/\s+/g, "_") || "Cliente"}.pdf`);
      
      setToastMessage("Orçamento gerado com sucesso!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erro ao gerar PDF. Verifique os dados e tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-easy-dark text-white font-sans pb-20 matrix-bg">
      {/* Header */}
      <header className="bg-easy-dark/90 backdrop-blur-xl sticky top-0 z-40 border-b border-easy-green/20 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-2 bg-easy-green/20 rounded-2xl blur-xl opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
              <img 
                src={LOGO_URL} 
                alt="EasyTech Logo" 
                className="relative w-28 h-28 rounded-2xl border-2 border-easy-green/40 shadow-[0_0_40px_rgba(34,197,94,0.3)] bg-easy-dark p-2"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col bg-black p-3 rounded-xl border border-white/10 shadow-2xl">
              <img src={LOGO2_URL} alt="EasyTech Store" className="h-20 w-auto" referrerPolicy="no-referrer" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setQuote(INITIAL_QUOTE)}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all hover:bg-white/5 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
            
            <div className="h-8 w-px bg-white/10 hidden md:block mx-2"></div>

            <button 
              onClick={copyToClipboard}
              disabled={!quote.clientName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-easy-gray hover:bg-gray-800 text-white transition-all border border-white/5 disabled:opacity-20 shadow-lg"
            >
              <Copy className="w-3.5 h-3.5 text-easy-green" />
              <span className="hidden sm:inline">Copiar Resumo</span>
            </button>
            
            <button 
              onClick={generatePDF}
              disabled={isGenerating || !quote.clientName}
              className={cn(
                "flex items-center gap-2 px-7 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(34,197,94,0.2)] border border-easy-green/30",
                quote.clientName 
                  ? "bg-easy-green hover:bg-green-400 text-easy-dark cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]" 
                  : "bg-gray-900 text-gray-600 cursor-not-allowed border-gray-800"
              )}
            >
              {isGenerating ? (
                <div className="w-3.5 h-3.5 border-2 border-easy-dark/30 border-t-easy-dark rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isGenerating ? "Processando..." : "Gerar Orçamento"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar - Category Selection */}
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-easy-gray/60 backdrop-blur-sm p-6 rounded-2xl border border-easy-green/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <Box className="w-4 h-4" /> Categoria
              </h2>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleInputChange("category", cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left uppercase tracking-widest",
                      quote.category === cat.id 
                        ? "bg-easy-green text-easy-dark shadow-[0_0_15px_rgba(34,197,94,0.2)] transform scale-[1.02]" 
                        : "bg-easy-dark/40 text-gray-400 hover:bg-easy-dark/60"
                    )}
                  >
                    <cat.icon className={cn("w-4 h-4", quote.category === cat.id ? "text-easy-dark" : "text-easy-green/50")} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-easy-gray/60 backdrop-blur-sm p-6 rounded-2xl border border-easy-green/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-easy-green" /> Financeiro
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-easy-green uppercase tracking-widest mb-1">VALOR À VISTA (R$)</label>
                  <input 
                    type="number" 
                    value={quote.price || ""}
                    onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full px-4 py-2.5 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green focus:border-transparent outline-none transition-all font-mono text-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-easy-green uppercase tracking-widest mb-1">TAXA JUROS CARTÃO (%)</label>
                  <input 
                    type="number" 
                    value={quote.interestRate || ""}
                    onChange={(e) => handleInputChange("interestRate", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green focus:border-transparent outline-none transition-all font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-easy-green uppercase tracking-widest mb-1">PARCELAS</label>
                  <input 
                    type="number" 
                    min={1}
                    max={24}
                    value={quote.installments || ""}
                    onChange={(e) => handleInputChange("installments", parseInt(e.target.value) || 1)}
                    placeholder="1"
                    className="w-full px-4 py-2.5 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green focus:border-transparent outline-none transition-all font-mono text-white"
                  />
                </div>

                <div className="pt-4 border-t border-easy-green/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TOTAL</span>
                    <span className="text-xl font-black text-easy-green">R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {quote.installments > 1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">PARCELADO</span>
                      <span className="text-xs font-bold text-white">{quote.installments}x de R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-easy-green uppercase tracking-widest mb-1">VALIDADE (DIAS)</label>
                  <select 
                    value={quote.validityDays}
                    onChange={(e) => handleInputChange("validityDays", parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green outline-none text-white"
                  >
                    <option value={3}>3 dias</option>
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-5 space-y-6">
            {/* Client Info */}
            <section className="bg-easy-gray/60 backdrop-blur-sm p-8 rounded-2xl border border-easy-green/10">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2">
                <User className="w-4 h-4 text-easy-green" /> Cliente
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-easy-green uppercase tracking-widest">
                    NOME *
                  </label>
                  <input 
                    type="text" 
                    value={quote.clientName}
                    onChange={(e) => handleInputChange("clientName", e.target.value)}
                    placeholder="João Silva"
                    className="w-full px-4 py-2.5 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green outline-none text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-easy-green uppercase tracking-widest">
                    TELEFONE
                  </label>
                  <input 
                    type="text" 
                    value={quote.clientPhone}
                    onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green outline-none text-white"
                  />
                </div>
              </div>
            </section>

            {/* Dynamic Content Based on Category */}
            <AnimatePresence mode="wait">
              <motion.section 
                key={quote.category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-easy-gray/60 backdrop-blur-sm p-8 rounded-2xl border border-easy-green/10"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-easy-green" /> 
                    {quote.category === "PC" ? "Configuração" : "Descrição"}
                  </h2>
                  
                  <label 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all cursor-pointer border border-dashed",
                      isDragging ? "border-easy-green bg-easy-green/10 text-easy-green" : "border-easy-green/20 text-easy-green/40 hover:border-easy-green/50 hover:text-easy-green",
                      isTranscribing && "opacity-50 cursor-wait"
                    )}
                  >
                    {isTranscribing ? (
                      <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Share2 className="w-2.5 h-2.5" />
                    )}
                    {isTranscribing ? "LENDO..." : "IA SCAN"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageTranscription}
                      disabled={isTranscribing}
                    />
                  </label>
                </div>

                {quote.category === "PC" ? (
                  <div className="space-y-4">
                    {[
                      { id: "processor", label: "PROCESSADOR", icon: Cpu },
                      { id: "motherboard", label: "PLACA MÃE", icon: CircuitBoard },
                      { id: "memory", label: "MEMÓRIA RAM", icon: Zap },
                      { id: "storage", label: "ARMAZENAMENTO", icon: HardDrive },
                      { id: "gpu", label: "PLACA DE VÍDEO", icon: Monitor },
                      { id: "powerSupply", label: "FONTE", icon: Zap },
                      { id: "case", label: "GABINETE", icon: Box },
                      { id: "cooling", label: "COOLER", icon: Zap },
                    ].map((comp) => (
                      <div key={comp.id} className="space-y-1">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-easy-green uppercase tracking-widest">
                          <comp.icon className="w-3 h-3" /> {comp.label}
                        </label>
                        <input 
                          type="text" 
                          value={(quote.pcComponents as any)?.[comp.id]}
                          onChange={(e) => handlePCComponentChange(comp.id as any, e.target.value)}
                          className="w-full px-4 py-2 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green outline-none text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-easy-green uppercase tracking-widest">DESCRIÇÃO DETALHADA</label>
                      <textarea 
                        rows={8}
                        value={quote.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        className="w-full px-4 py-3 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green outline-none resize-none text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </motion.section>
            </AnimatePresence>

            {/* Payment & Notes */}
            <section className="bg-easy-gray/60 backdrop-blur-sm p-8 rounded-2xl border border-easy-green/10">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-easy-green" /> Observações
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-easy-green uppercase tracking-widest">PAGAMENTO</label>
                  <input 
                    type="text" 
                    value={quote.paymentTerms}
                    onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                    className="w-full px-4 py-2.5 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green outline-none text-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-easy-green uppercase tracking-widest">NOTAS</label>
                  <textarea 
                    rows={3}
                    value={quote.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    className="w-full px-4 py-3 bg-easy-dark/50 border border-easy-green/20 rounded-xl focus:ring-1 focus:ring-easy-green outline-none resize-none text-white text-sm"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* PDF Preview Area */}
          <div className="lg:col-span-4 sticky top-24 h-fit">
            <div className="bg-easy-dark rounded-3xl border border-easy-green/30 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
              {/* Matrix Background Pattern */}
              <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: `url(${BG_URL})`, backgroundSize: 'cover' }}></div>
              <div className="absolute inset-0 bg-gradient-to-b from-easy-dark/40 via-easy-dark/90 to-easy-dark pointer-events-none"></div>
              
              <div className="relative p-10 min-h-[700px] flex flex-col">
                {/* PDF Header */}
                <div className="flex justify-between items-start mb-14">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="absolute -inset-2 bg-easy-green/10 rounded-xl blur-lg"></div>
                      <img src={LOGO_URL} alt="Logo" className="relative w-24 h-24 rounded-xl border border-easy-green/20" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col bg-black p-3 rounded-xl border border-white/10 shadow-lg">
                      <img src={LOGO2_URL} alt="EasyTech Store" className="h-14 w-auto" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-easy-green uppercase tracking-[0.2em] mb-1">Orçamento</div>
                    <div className="text-sm font-black text-white">{format(new Date(quote.date), "dd/MM/yyyy")}</div>
                  </div>
                </div>

                {/* Client Info Bar */}
                <div className="bg-white/5 border-y border-white/10 py-3 mb-8 flex justify-between px-2">
                  <div>
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Cliente</div>
                    <div className="text-[10px] font-bold text-white uppercase">{quote.clientName || "Selecione um cliente"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Data</div>
                    <div className="text-[10px] font-bold text-white">{format(new Date(quote.date), "dd/MM/yyyy")}</div>
                  </div>
                </div>

                {/* PDF Content */}
                <div className="flex-grow space-y-1">
                  {quote.category === "PC" && quote.pcComponents ? (
                    <>
                      {[
                        { id: "processor", label: "PROCESSADOR", icon: Cpu, value: quote.pcComponents.processor },
                        { id: "memory", label: "MEMÓRIA RAM", icon: Zap, value: quote.pcComponents.memory },
                        { id: "motherboard", label: "PLACA MÃE", icon: CircuitBoard, value: quote.pcComponents.motherboard },
                        { id: "gpu", label: "PLACA DE VÍDEO", icon: Monitor, value: quote.pcComponents.gpu || "INTEGRADA" },
                        { id: "powerSupply", label: "FONTE REAL", icon: Zap, value: quote.pcComponents.powerSupply },
                        { id: "case", label: "GABINETE GAMER", icon: Box, value: quote.pcComponents.case },
                        { id: "storage", label: "ARMAZENAMENTO", icon: HardDrive, value: quote.pcComponents.storage },
                      ].filter(c => c.value).map((item) => (
                        <div key={item.id} className="pdf-item-box">
                          <div className="pdf-icon-container">
                            <item.icon className="w-5 h-5 text-easy-green" />
                          </div>
                          <div className="flex-grow">
                            <div className="pdf-item-label">{item.label}</div>
                            <div className="pdf-item-value">{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-grow bg-easy-green/20"></div>
                        <div className="text-easy-green font-black uppercase tracking-[0.2em] text-[10px]">Descrição do Item</div>
                        <div className="h-px flex-grow bg-easy-green/20"></div>
                      </div>
                      <div className="text-white font-bold text-sm leading-relaxed opacity-90 whitespace-pre-wrap bg-white/5 p-6 rounded-2xl border border-white/5">
                        {quote.description || "Nenhuma descrição informada."}
                      </div>
                    </div>
                  )}
                </div>

                {/* PDF Prices */}
                <div className="mt-12 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="pdf-price-pill">
                      VALOR À VISTA
                    </div>
                    <div className="text-2xl font-black text-white">
                      R$ {quote.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  {quote.installments > 1 && (
                    <div className="flex justify-between items-center border-t border-white/10 pt-4">
                      <div className="text-[10px] font-black text-easy-green uppercase tracking-[0.2em]">
                        PARCELAMENTO ({quote.installments}X)
                      </div>
                      <div className="text-base font-black text-white/80">
                        {quote.installments}X DE R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>

                {/* PDF Footer Logo */}
                <div className="mt-14 pt-8 border-t border-white/5 flex flex-col items-start gap-2">
                   <div className="flex items-center gap-3">
                      <img src={LOGO_URL} alt="Logo" className="w-10 h-10" referrerPolicy="no-referrer" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black tracking-tighter text-white">EASYTECH STORE</span>
                        <span className="text-[8px] font-bold text-easy-green uppercase tracking-widest">Instagram: @easytechstorers</span>
                        <span className="text-[8px] font-bold text-easy-green uppercase tracking-widest">WhatsApp: 54-991370566</span>
                      </div>
                   </div>
                   <div className="w-full text-right mt-2">
                     <div className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                       Validade: {format(addDays(new Date(quote.date), quote.validityDays), "dd/MM/yyyy")}
                     </div>
                   </div>
                </div>
              </div>
            </div>
            
            <p className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-4">
              Visualização em Tempo Real
            </p>
          </div>
        </div>
      </main>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#141414] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50"
          >
            <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
            <span className="font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
