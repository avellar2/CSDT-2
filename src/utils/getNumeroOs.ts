export const getNumeroOs = async (formData: FormDataType): Promise<string> => {
  try {
    const currentDate = new Date();
    const response = await fetch("/api/save-os-externa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ formData }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao salvar os dados");
    }

    const numeroOs = `${result.id}/${currentDate.getFullYear()}`;
    console.log("Número da OS gerado:", numeroOs);
    return numeroOs;
  } catch (error) {
    console.error("Erro ao gerar o número da OS:", error);
    throw error;
  }
};