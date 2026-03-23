# VulnerabilityScanner

Плагин для сканирования открытого проекта на наличие "захардкоженных" секретов (токенов, паролей, ключей API) и предоставление удобного интерфейса для их анализа и исправления.
Выполнил - Кочуров Сергей

## Реализовано

- команда `Vulnerability Scanner: Start Scan`
- вывод результатов в `Problems`
- переход к проблеме по клику
- `Quick Fix` для C# строковых литералов
- настройки плагина
- инкрементальное обновление результатов при сохранении файла

## Что именно ищет

По умолчанию расширение проверяет C# файлы (`.cs`) и ищет:

- `password`
- `apiKey`
- `token`
- `connection string`

Примеры, которые будут найдены:

```csharp
var password = "123456";
string apiKey = "abcdef-secret-key";
var authToken = "my-super-token";
var connectionString = "Server=localhost;Database=AppDb;User Id=sa;Password=123";
```

## Как собрать и запустить

### 1. Открыть проект

Открой эту папку в VS Code.

### 2. Установить зависимости

```bash
npm install
```

### 3. Собрать extension

```bash
npm run compile
```

### 4. Запустить extension host

Нажми `F5`.

Откроется новое окно **Extension Development Host**.

### 5. В новом окне (на `F5`) создать файл с расширением `.cs` и написать в нем например:

```csharp
public class Test
{
    public void Run()
    {
        var password = "mysecretpassword";
        var apiKey = "QWERty42367-sdfgHGJHKG73846";
        var connectionString = "Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;";
        var authToken = "my-super-token";
    }
}
```

Потом откройте командную палитру:`Ctrl+Shift+P` и выберите `Vulnerability Scanner: Start Scan`

Откройте `Problems` (`Ctrl+Shift+M`) - появятся предупреждения.

Сделанные фичи:
## QuickFix

При наведении на ошибку, будет показаны варианты изменения.

Пример работы Quick Fix:

```csharp
var password = "123456";
```

заменит на:

```csharp
var password = Environment.GetEnvironmentVariable("APP_PASSWORD");
```

## Настройки

Откройте `Settings(CTRL+,)` и найдите `Vulnerability Scanner`.

Доступные настройки:
- `VulnerabilityScanner.scanOnSave` - включить/выключить функцию скана при сохранении файла.
- `VulnerabilityScanner.enablePasswordScan` - включить/выключить функцию скана паролей.
- `VulnerabilityScanner.enableApiKeyScan` - включить/выключить функцию скана apiKey.
- `VulnerabilityScanner.enableTokenScan` - включить/выключить функцию скана токенов.
- `VulnerabilityScanner.includeGlobs` - включить директории для сканирования.
- `VulnerabilityScanner.excludeGlobs` - исключить директории для сканирования.
- `VulnerabilityScanner.customRegexes` - возможность задать кастомный regex (например для json).

## Сканирование (инкрементальное) файла при сохранении документа (OnSave)

Если сохранить изменения документа, то сканер запустится только на этом документе.
Сканирование при сохранении можно выключить в настройках (`CTRL+,`)

## Очистка найденных проблем

Потом откройте командную палитру:`Ctrl+Shift+P` и выберите `Vulnerability Scanner: Clear Results`
Примечание - команда уберет ошибки только для Vulnerability Scanner.

# Файлы
- scanner.ts - основная логика поиска
- types.ts - типы данных (dto)
- codeActions.ts - реализация quickFix
- extenson.ts - точка регистрации плагина
- package.json - настройки плагина (когда активируется и настройки плагина)