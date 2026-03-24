-- Script para crear la base de datos y las tablas del restaurante

CREATE DATABASE IF NOT EXISTS restaurante1;
USE restaurante1;

-- Tabla Administrador
CREATE TABLE IF NOT EXISTS Administrador (
    idAdministrador INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'admin'
);

-- Tabla Cliente
CREATE TABLE IF NOT EXISTS Cliente (
    idCliente INT PRIMARY KEY AUTO_INCREMENT,
    nombre1 VARCHAR(100) NOT NULL,
    nombre2 VARCHAR(100),
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    contrasena VARCHAR(255) -- Añadido para login de usuario
);

-- Tabla Mesa
CREATE TABLE IF NOT EXISTS Mesa (
    idMesas INT PRIMARY KEY,
    numero VARCHAR(50) NOT NULL,
    capacidad INT NOT NULL,
    ubicacion VARCHAR(100),
    diponibilidad TINYINT(1) DEFAULT 1,
    tipo VARCHAR(50)
);

-- Tabla Reserva
CREATE TABLE IF NOT EXISTS Reserva (
    folioReserva INT PRIMARY KEY AUTO_INCREMENT,
    Cliente_idCliente INT NOT NULL,
    Mesa_idMesas INT,
    fecha_hora DATETIME NOT NULL,
    numero_personas INT NOT NULL,
    estado VARCHAR(50) DEFAULT 'CREADA',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    FOREIGN KEY (Cliente_idCliente) REFERENCES Cliente(idCliente),
    FOREIGN KEY (Mesa_idMesas) REFERENCES Mesa(idMesas)
);
