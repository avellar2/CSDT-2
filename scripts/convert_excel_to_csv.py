import pandas as pd

# Ler o arquivo Excel
df = pd.read_excel('C:/Users/Vanderson/Documents/CSDT-2/public/itens.xlsx')

# Salvar como CSV
df.to_csv('C:/Users/Vanderson/Documents/CSDT-2/public/itens_converted.csv', index=False, encoding='utf-8')

print("Arquivo convertido com sucesso!")
print("Colunas disponíveis:", list(df.columns))
print("Primeiras 5 linhas:")
print(df.head())