# Memorando de Troca - PDF Form Filling

Este documento descreve como usar o sistema de preenchimento automático do PDF de memorando de troca de equipamentos entre escolas.

## Campos Identificados no PDF

O PDF `memorando-troca2.pdf` contém os seguintes campos de formulário:

| Campo | Descrição | Localização no Documento |
|-------|-----------|-------------------------|
| `data` | Data do memorando | Cabeçalho |
| `numero_memorando` | Número do memorando | Campo "MEMO Nº" |
| `origem` | Escola de origem | Campo "De:" |
| `destino` | Escola de destino | Campo "Para:" |
| `distrito_origem` | Distrito da escola de origem | Primeiro campo "DISTRITO:" |
| `distrito_destino` | Distrito da escola de destino | Segundo campo "DISTRITO:" |
| `antigo` | Lista de equipamentos que saem | Área após "seguintes equipamentos locados citados abaixo:" |
| `novo` | Lista de equipamentos que chegam | Área após "SUBSTITUÍDO POR:" |

## Uso da API

### Função Principal

```typescript
import { generateMemorandoTrocaBase64 } from '@/utils/pdfMemorandoTroca';

const data = {
  memorandumNumber: "001/2025",
  fromSchool: "E.M. ESCOLA ORIGEM",
  toSchool: "E.M. ESCOLA DESTINO",
  fromDistrict: "1º DISTRITO",
  toDistrict: "2º DISTRITO",
  outgoingEquipment: [
    {
      brand: "HP",
      model: "EliteDesk 800",
      serialNumber: "ABC123"
    }
  ],
  incomingEquipment: [
    {
      brand: "Lenovo", 
      model: "ThinkCentre",
      serialNumber: "XYZ789"
    }
  ]
};

const pdfBase64 = await generateMemorandoTrocaBase64(data);
```

### Integração com API Existente

A API `/api/generate-memorandum` foi atualizada para usar automaticamente a nova função quando `type === 'troca'`:

```javascript
// POST /api/generate-memorandum
{
  "itemIds": [1, 2, 3],
  "memorandumNumber": "001/2025",
  "type": "troca",
  "fromSchool": {
    "name": "E.M. ESCOLA ORIGEM",
    "district": "1º DISTRITO",
    "inep": 12345678
  },
  "toSchool": {
    "name": "E.M. ESCOLA DESTINO", 
    "district": "2º DISTRITO",
    "inep": 87654321
  }
}
```

## Formatos Suportados para Equipamentos

### Formato Objeto (Recomendado)
```javascript
{
  brand: "HP",
  model: "EliteDesk 800 G3",
  serialNumber: "ABC123456"
}
```

### Formato String
```javascript
"Computador HP EliteDesk 800 - Serial: ABC123456"
```

## Exemplo Completo

```javascript
const { fillMemorandoTroca } = require('./fill-memorando-troca');

async function exemploCompleto() {
  const dados = {
    memorandumNumber: "001/2025",
    fromSchool: "E.M. FRANCISCO CAMPOS",
    toSchool: "E.M. PROFESSOR MONTEIRO LOBATO",
    fromDistrict: "1º DISTRITO - DUQUE DE CAXIAS",
    toDistrict: "2º DISTRITO - DUQUE DE CAXIAS",
    outgoingEquipment: [
      {
        brand: "HP",
        model: "EliteDesk 800 G3 SFF",
        serialNumber: "BRC8470123"
      },
      {
        brand: "Dell", 
        model: "Monitor P2414H 24\"",
        serialNumber: "CN-0P2414H-123"
      },
      "Estabilizador SMS Revolution Speedy 300VA - Serial: REV300-001"
    ],
    incomingEquipment: [
      {
        brand: "Lenovo",
        model: "ThinkCentre M920s SFF", 
        serialNumber: "PC123ABC"
      },
      {
        brand: "LG",
        model: "Monitor 22MK430H-B 21.5\"",
        serialNumber: "LG22MK-456"
      },
      "Estabilizador Ragtech New Line EVO 600VA - Serial: EVO600-789"
    ],
    date: new Date("2025-01-31")
  };

  try {
    const pdfBuffer = await fillMemorandoTroca(dados);
    console.log('PDF gerado com sucesso!');
    
    // Salvar arquivo
    require('fs').writeFileSync('./memorando-preenchido.pdf', pdfBuffer);
    
    return pdfBuffer;
  } catch (error) {
    console.error('Erro:', error);
  }
}
```

## Estrutura dos Arquivos

```
src/
├── utils/
│   └── pdfMemorandoTroca.ts     # Funções TypeScript para preenchimento
├── pages/api/
│   └── generate-memorandum.ts   # API atualizada com suporte a troca
└── ...

public/
└── memorando-troca2.pdf         # Template do PDF

fill-memorando-troca.js          # Versão JavaScript standalone
test-memorando-troca.js          # Script de teste
```

## Testando

Execute o script de teste para verificar se tudo está funcionando:

```bash
node test-memorando-troca.js
```

## Observações

1. **Data Automática**: Se não fornecida, usa a data atual formatada em português
2. **Validação**: Os campos são preenchidos com fallbacks vazios se não fornecidos
3. **Flexibilidade**: Suporta tanto objetos estruturados quanto strings simples para equipamentos
4. **Compatibilidade**: Totalmente integrado com o sistema existente do CSDT-2

## Troubleshooting

### PDF não encontrado
Verifique se o arquivo `public/memorando-troca2.pdf` existe no projeto.

### Campos não preenchidos
Verifique se os nomes dos campos no PDF correspondem aos esperados. Use o script de inspeção para verificar:

```javascript
// Ver fill-memorando-troca.js linha 1-30 para função de inspeção
```

### Erro de encoding
Certifique-se de que o PDF está corretamente codificado e não corrompido.