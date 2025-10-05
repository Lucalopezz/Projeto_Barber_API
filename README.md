# ✂️ Barber Shop API - Clean Architecture & DDD

This is a backend project currently under development, aiming to build a robust, scalable, and maintainable RESTful API for managing a barber shop business.

The project applies **Clean Architecture**, **Domain-Driven Design (DDD)** principles, and is built with **NestJS**, **TypeScript**, and **Prisma**. It also includes **automated testing** at various levels (unit, integration, and e2e) and follows modern development practices such as **SOLID principles**, **design patterns**, and **API documentation with Swagger**.

## 📦 Tech Stack

- Node.js / TypeScript
- NestJS Framework
- Prisma ORM
- PostgreSQL (local or Docker)
- Swagger (API documentation)
- Vitest (Testing framework)

## 📚 Main Features (planned)

- User and authentication system
- Barber and client management
- Service scheduling
- Daily/weekly availability for barbers
- Role-based access control (RBAC)
- Notifications and service reminders
- Admin dashboard endpoints

## 🛠️ Project Structure

The application follows Clean Architecture, dividing the project into layers such as:

````
src/
├── appointments/            ⬅ Módulo de agendamentos
│   ├── application/
│   │   ├── dtos/
│   │   ├── use-cases/
│   │   └── interfaces/
│   │
│   ├── domain/
│   │   ├── entities/         ⬅ Ex: Appointment.ts
│   │   └── value-objects/    ⬅ Ex: DateRange.ts
│   │
│   └── infrastructure/
│       ├── controllers/
│       ├── repositories/
│       ├── mappers/
│       └── appointment.module.ts
│
├── users/                   ⬅ Módulo de usuários (clientes e barbearia)
│   ├── application/
│   ├── domain/
│   └── infrastructure/
│
├── services/                ⬅ Serviços oferecidos (corte, barba, combo etc)
│   ├── application/
│   ├── domain/
│   └── infrastructure/
│
├── auth/                    ⬅ Autenticação e autorização
│   ├── application/
│   ├── domain/
│   └── infrastructure/
│
├── shared/                  ⬅ Código reutilizável e utilitários
│   ├── application/
│   │   └── interfaces/
│   ├── domain/
│   │   └── value-objects/     ⬅ Ex: Email.ts, UUID.ts
│   └── infrastructure/
│       ├── database/
│       ├── exceptions/
│       ├── middlewares/
│       ├── guards/
│       ├── interceptors/
│       └── utils/
│
├── app.module.ts
├── global-config.ts
└── main.ts
````


## 🚧 Status

**This project is still in early development.**

Code structure, features, and technologies may change as I refine and expand the design.

---

Feel free to follow this repository to check progress, suggest improvements, or collaborate in the future!


