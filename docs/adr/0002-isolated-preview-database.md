# Banco de preview separado da produção

Os previews usarão branches de um projeto Neon com dados fictícios; produção usará outro projeto Neon com os dados reais. A integração da Neon cria branches que copiam os dados da origem e não documenta a escolha de outra origem por preview, então separar os projetos evita copiar dados reais para esses ambientes. Essa escolha exige manter os dados de teste e reduz a fidelidade dos previews em relação à produção.
