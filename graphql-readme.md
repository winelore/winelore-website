# 📚 Повна документація та інструкція: GraphQL API Контракт & SDK

[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Tool: GraphQL Codegen](https://img.shields.io/badge/Tool-GraphQL_Codegen-E10098?style=flat-square&logo=graphql)](https://the-guild.dev/graphql/codegen)
[![Deployment: Railway](https://img.shields.io/badge/Deployment-Railway-131415?style=flat-square&logo=railway)](https://railway.app)

## 🔄 Як генерувати SDK
Використовуй один із двох сценаріїв запуску в терміналі 
залежно від твоїх поточних завдань:
### Варіант А: Одноразова синхронізація
Запускай цю команду, якщо розробник бекенду щойно оновив схему (додав нові таблиці, поля чи мутації), або безпосередньо перед деплоєм проєкту на продакшн:

```npm run codegen```

### Варіант Б: Автоматичне відстеження (Рекомендовано для розробки)
Запусти цю команду в окремій вкладці терміналу під час написання коду. Вона працює як фоновий демон: щоразу, як ти створиш або зміниш запит у компоненті та натиснеш Зберегти, типи в src/gql/ оновляться автоматично.

```npm run codegen:watch```

## 💻 Паттерни інтеграції в коді (Next.js)
### 1. Оголошення запиту-контракту
Щоб підключити схему бекенду до вашого файлу, імпортуй функцію gql виключно з локальної згенерованої папки:
```// src/app/products/page.tsx
import { gql } from '@/gql'; // 🎯 Тільки локальний імпорт!

const GET_ALL_WINES = gql(`
  query GetAllWines {
    wines {
      id
      name
      price
      year
    }
  }
`);
```
### 2. Створення легкого клієнта запитів
Для Next.js App Router (Server Components) найкраще використовувати нативний fetch. Створи файл src/lib/apiClient.ts для централізованих запитів:
```// src/lib/apiClient.ts
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';

const GRAPHQL_ENDPOINT = '[http://localhost:8080/graphql](http://localhost:8080/graphql)';

export async function fetchGraphQL<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
): Promise<TResult> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: print(document),
      variables,
    }),
    next: { revalidate: 60 } // Кешування Next.js (ISR) на 60 секунд
  });

  const { data, errors } = await response.json();

  if (errors) {
    console.error('GraphQL Pipeline Error:', errors);
    throw new Error(errors[0]?.message || 'Помилка виконання GraphQL запиту');
  }

  return data;
}
```

### 3. Виклик у Серверному Компоненті (RSC)
Дані повертаються вже повністю типізованими. Тобі доступний автокомпліт для кожного поля:

```
// src/app/products/page.tsx
import { fetchGraphQL } from '@/lib/apiClient';
import { gql } from '@/gql';

const GET_ALL_WINES = gql(`
  query GetAllWines {
    wines {
      id
      name
      price
    }
  }
`);

export default async function WinesPage() {
  // Запит виконується на сервері. data має строгу структуру відповіді від API
  const data = await fetchGraphQL(GET_ALL_WINES);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Wine Selection</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.wines?.map((wine) => (
          <div key={wine.id} className="border p-4 rounded-lg shadow-sm bg-white">
            <h2 className="font-semibold text-lg">{wine.name}</h2>
            <p className="text-gray-500">{wine.price} UAH</p>
          </div>
        ))}
      </div>
    </main>
  );
}
```

## 🛠️ Вирішення можливих проблем (Troubleshooting)
Помилка ParseError: Unexpected token під час запуску codegen: Зазвичай це трапляється через копіювання «невидимих пробілів» (non-breaking spaces) з браузера. Переконайся, що файл codegen.ts очищено від прихованого форматування (скопіюй чистий код з цієї інструкції).

Червоні лінії під назвами полів всередині gql(...):
Твій фронтенд-контракт розійшовся зі станом сервера. Запусти npm run codegen. Якщо лінії не зникли, отже розробник бекенду змінив або видалив це поле з API. Перевір назву поля у схемі або звернись до бекенд-команди.

Помилка 404 Not Found:
Перевір працездатність контейнера на Railway та правильність шляху в codegen.ts. Наприкінці адреси обов'язково має бути роут /graphql.