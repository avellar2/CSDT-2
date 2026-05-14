import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DADOS_ESCOLAS = [
  { "nome": "EE MUNICIPALIZADA GENERAL TIBÚRCIO", "total": 3 },
  { "nome": "EM ANÍSIO SPÍNOLA TEIXEIRA", "total": 10 },
  { "nome": "CRECHE E PRÉ- ESC MUNICIPAL PROFº JOÃO DE OLIVEIRA", "total": 2 },
  { "nome": "EE MUNICIPALIZADA OSWALDO CRUZ", "total": 12 },
  { "nome": "EM VINTE E UM DE ABRIL", "total": 12 },
  { "nome": "E.M BILÍNGUE ITAMAR FRANCO", "total": 18 },
  { "nome": "EM PROFª HILDA DO CARMO SIQUEIRA", "total": 10 },
  { "nome": "EM PROF MOTTA SOBRINHO", "total": 17 },
  { "nome": "EM CORA CORALINA", "total": 8 },
  { "nome": "CRECHE e EM DR. ÁLVARO ALBERTO", "total": 14 },
  { "nome": "EM HERMÍNIA CALDAS DA SILVA", "total": 2 },
  { "nome": "EM ANA NERY", "total": 19 },
  { "nome": "EM CARLOTA MACHADO", "total": 18 },
  { "nome": "EM JOAQUIM DA SILVA PEÇANHA", "total": 1 },
  { "nome": "EM SANTA TEREZINHA", "total": 10 },
  { "nome": "EM PROF JAIR ALVES DE FREITAS", "total": 15 },
  { "nome": "EM JARDIM GRAMACHO", "total": 5 },
  { "nome": "EM VISCONDE DE ITABORAÍ", "total": 18 },
  { "nome": "EM JOSÉ MEDEIROS CABRAL", "total": 2 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 097 - CARLOS CHAGAS", "total": 2 },
  { "nome": "EM EXPEDICIONÁRIO AQUINO DE ARAÚJO", "total": 17 },
  { "nome": "EM PROF ONERES NUNES OLIVEIRA", "total": 2 },
  { "nome": "EM LIONS", "total": 20 },
  { "nome": "EM MAURO DE CASTRO", "total": 14 },
  { "nome": "EM HELENA AGUIAR DE MEDEIROS", "total": 2 },
  { "nome": "EM WILSON DE OLIVEIRA SIMÕES", "total": 15 },
  { "nome": "EM PROFª ZILLA JUNGER DA SILVA", "total": 10 },
  { "nome": "CIEP BRIZOLÃO MUNICICPALIZADO 405 - MINISTRO SANTIAGO DANTAS", "total": 13 },
  { "nome": "EM Dr RICARDO AUGUSTO DE AZEREDO VIANNA", "total": 18 },
  { "nome": "EM PROF ROMEU MENEZES DOS SANTOS", "total": 2 },
  { "nome": "EM PROFª OLGA TEIXEIRA DE OLIVEIRA", "total": 24 },
  { "nome": "EM RUY BARBOSA", "total": 15 },
  { "nome": "EM SERGIPE", "total": 8 },
  { "nome": "CRECHE E PRÉ -ESCOLA MUNICIPAL PEQUENO GUERREIRO", "total": 1 },
  { "nome": "CRECHE e PRÉ-ESC MUNICIPAL UBALDINA ALVES DA SILVA", "total": 1 },
  { "nome": "CRECHE MUNICIPAL LÚCIA DE FATIMA BOMFIM DE CASTRO E SILVA", "total": 4 },
  { "nome": "EM BILÍNGUE SENOR ABRAVANEL SILVIO SANTOS", "total": 14 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 120 - MONTEIRO LOBATO", "total": 2 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 220 - YOLANDA BORGES", "total": 2 },
  { "nome": "CRECHE E PRÉ-ESCOLA MUNICIPAL ALBERT SABIN", "total": 3 },
  { "nome": "EM MINISTRO WALDEMAR ZVEITER", "total": 13 },
  { "nome": "EM ANTON DWORSAK", "total": 2 },
  { "nome": "EM DR.MANOEL REIS", "total": 10 },
  { "nome": "EM WANDA GOMES SOARES", "total": 10 },
  { "nome": "EM PROF VILMAR BASTOS FURTADO", "total": 12 },
  { "nome": "EM CAMPOS ELÍSEOS", "total": 2 },
  { "nome": "EM CORONEL ELISEU", "total": 2 },
  { "nome": "CRECHE MUNICIPAL MARLUSE VICENTE DA SILVA", "total": 5 },
  { "nome": "CRECHE MUNICIPAL PROFª JESUÍNA FÁTIMA DE ANDRADE", "total": 1 },
  { "nome": "CRECHE MUNICIPAL ZELINA PENIDO DA ROSA", "total": 4 },
  { "nome": "EM EULINA PINTO DE BARROS", "total": 2 },
  { "nome": "EM JAYME FICHMAN", "total": 2 },
  { "nome": "EM CIDADE DOS MENINOS", "total": 2 },
  { "nome": "EM SOLANO TRINDADE", "total": 2 },
  { "nome": "EM PEDRO RODRIGUES DO CARMO", "total": 14 },
  { "nome": "EE MUNIPALIZADA TANCREDO NEVES", "total": 13 },
  { "nome": "EM PROF JOÃO FAUSTINO DE FRANÇA SOBRINHO", "total": 14 },
  { "nome": "EM FRANCISCO OSWALDO NEVES DORNELLES", "total": 15 },
  { "nome": "EM MONTEIRO LOBATO", "total": 15 },
  { "nome": "EM OLINDA BONTURI BOLSONARO", "total": 15 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 318 - PAULO MENDES CAMPOS", "total": 17 },
  { "nome": "EE MUNICIPALIZADA MARECHAL MASCARENHAS DE MORAES", "total": 18 },
  { "nome": "EM NÍSIA VILELA FERNANDES", "total": 18 },
  { "nome": "EM PROF WALTER RUSSO DE SOUZA", "total": 20 },
  { "nome": "EE MUNICIPALIZADA BAIRRO CALIFÓRNIA", "total": 20 },
  { "nome": "EM IMACULADA CONCEIÇÃO", "total": 20 },
  { "nome": "EM JOSÉ CAMILO DOS SANTOS", "total": 20 },
  { "nome": "EM PRESIDENTE COSTA E SILVA", "total": 20 },
  { "nome": "CRECHE MUNICIPAL HYDEKEL DE FREITAS LIMA", "total": 3 },
  { "nome": "EM REGINA CELI DA SILVA CERDEIRA", "total": 16 },
  { "nome": "CRECHE MUNICIPAL FABIO TENÓRIO CAVALCANTI", "total": 1 },
  { "nome": "EM INTERCULTURAL MÉXICO - PROFª NILCELINA DOS SANTOS FERREIRA", "total": 18 },
  { "nome": "EE MUNICIPALIZADA PROFª MARIA DE ARAUJO DA SILVA", "total": 2 },
  { "nome": "EM FRANCISCO BARBOZA LEITE", "total": 2 },
  { "nome": "EM GENERAL MOURÃO FILHO", "total": 2 },
  { "nome": "EM MARECHAL FLORIANO PEIXOTO", "total": 2 },
  { "nome": "E.M BILÍNGUE ZIRALDO ALVES PINTO", "total": 20 },
  { "nome": "EM ULYSSES SILVEIRA GUIMARÃES", "total": 22 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 015 - HENRIQUE DE SOUZA FILHO - HENFIL", "total": 14 },
  { "nome": "EM PEDRO PAULO DA SILVA", "total": 14 },
  { "nome": "EM BARÃO DA TAQUARA", "total": 15 },
  { "nome": "EM PROFª CARMEM CORRÊA DE CARVALHO REIS BRAZ", "total": 15 },
  { "nome": "EM SANTA RITA", "total": 16 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 330 -MARIA DA GLORIA CORREA LEMOS", "total": 14 },
  { "nome": "CRECHE E EM DONA LEDA GRANJA VICTER", "total": 5 },
  { "nome": "CRECHE E PRÉ-ESCOLA MUNICIPAL PROFª DALVA LAZARONI DE MORAES", "total": 3 },
  { "nome": "CRECHE E PRÉ-ESCOLA MUNICIPAL PROFª ROSALITA DA SILVA NETTO", "total": 4 },
  { "nome": "EM NOVA CAMPINAS", "total": 2 },
  { "nome": "EM PAULO RODRIGUES PEREIRA", "total": 2 },
  { "nome": "EM PROFª DULCE TRINDADE BRAGA", "total": 2 },
  { "nome": "EM ROTARY", "total": 2 },
  { "nome": "EM LUIZ GAMA BORGES", "total": 4 },
  { "nome": "EM MÁRCIO FIAT", "total": 14 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 319 - ODUVALDO VIANA FILHO", "total": 17 },
  { "nome": "EM CFN EDUARDO GOMES DE OLIVEIRA", "total": 18 },
  { "nome": "EM ROBERTO WEGUELIN DE ABREU", "total": 18 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 227 - PROCÓPIO FERREIRA", "total": 20 },
  { "nome": "EM ALMIRANTE TAMANDARÉ", "total": 20 },
  { "nome": "EM PROFª DALVA BORGES DA CUNHA", "total": 20 },
  { "nome": "EM LENI FERNANDES DO NASCIMENTO", "total": 2 },
  { "nome": "EM PARQUE CAPIVARI", "total": 2 },
  { "nome": "EM SANTO AGOSTINHO", "total": 2 },
  { "nome": "EM BRASIL-ITÁLIA", "total": 8 },
  { "nome": "EM MONTESE", "total": 16 },
  { "nome": "EM SANTA RITA", "total": 10 },
  { "nome": "EE MUNICIPALIZADA SERGIPE", "total": 14 },
  { "nome": "EM BILÍNGUE EMBAIXADOR OSWALDO ARANHA", "total": 16 },
  { "nome": "EM BARÃO DO AMAPÁ", "total": 18 },
  { "nome": "EM PROFª AILA SALDANHA DO COUTO", "total": 18 },
  { "nome": "CIEP BRIZOLÃO MUNICIPALIZADO 338 - CÉLIA RABELO", "total": 15 },
  { "nome": "E. M. PROFESSORA MARIA HELENA TENÓRIO CAVALCANTE", "total": 16 },
  { "nome": "EM SARGENTO JOÃO DÉLIO DOS SANTOS", "total": 4 },
  { "nome": "ANEXO (Creche) : IGREJA METODISTA", "total": 1 },
  { "nome": "CSDT", "total": 83 },
  { "nome": "SME", "total": 272 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {

    // Limpar todos os dados existentes
    await prisma.locados.deleteMany({});

    // Inserir novos dados
    let count = 0;
    for (const escola of DADOS_ESCOLAS) {
      await prisma.locados.create({
        data: {
          name: escola.nome,
          pcs: escola.total,
          notebooks: 0,
          tablets: 0,
          estabilizadores: 0,
          impressoras: 0
        }
      });
      count++;
    }

    return res.status(200).json({
      success: true,
      message: `Sincronização concluída com sucesso! ${count} escolas importadas.`,
      total: count
    });

  } catch (error) {
    console.error('❌ Erro ao sincronizar dados:', error);
    return res.status(500).json({
      error: "Erro ao sincronizar dados de equipamentos locados",
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}
