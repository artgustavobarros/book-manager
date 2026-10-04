/**
 * Gravações de um valor absoluto (como a meta) em fila: cada envio espera o anterior,
 * então a última a chegar ao servidor é a última pedida. Só a falha da gravação mais
 * recente é reportada; falhas de gravações já superadas são ignoradas.
 */
export function createLatestSaver<T>(
  save: (value: T) => Promise<unknown>,
  {
    initial,
    onFail,
  }: { initial: T; onFail: (lastSaved: T, error: Error) => void }
) {
  let queue: Promise<unknown> = Promise.resolve();
  let seq = 0;
  let saved = initial;
  return (value: T): Promise<void> => {
    const mine = ++seq;
    const run = queue.then(() =>
      save(value).then(
        () => {
          saved = value;
        },
        (error: Error) => {
          if (mine === seq) {
            onFail(saved, error);
          }
        }
      )
    );
    queue = run;
    return run;
  };
}
