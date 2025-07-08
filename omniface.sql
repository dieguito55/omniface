-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 08-07-2025 a las 21:32:10
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `omniface`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `departamentos`
--

CREATE TABLE `departamentos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `creado_en` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `departamentos`
--

INSERT INTO `departamentos` (`id`, `usuario_id`, `nombre`, `creado_en`) VALUES
(10, 6, '5 B', '2025-07-05 23:51:52'),
(13, 6, 'ODANC', '2025-07-06 00:30:17'),
(16, 6, 'oficina central', '2025-07-06 12:40:20'),
(17, 6, '8VO SEMESTRE', '2025-07-06 20:23:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modelos_generados`
--

CREATE TABLE `modelos_generados` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `ruta_modelo` varchar(255) NOT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  `cantidad_embeddings` int(11) DEFAULT 0,
  `cantidad_descartados` int(11) DEFAULT 0,
  `tiempo_total_segundos` float DEFAULT 0,
  `ruta_errores` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `modelos_generados`
--

INSERT INTO `modelos_generados` (`id`, `usuario_id`, `ruta_modelo`, `fecha`, `cantidad_embeddings`, `cantidad_descartados`, `tiempo_total_segundos`, `ruta_errores`) VALUES
(57, 12, 'modelo_final\\usuario_12\\faiss.index', '2025-07-05 19:14:41', 4, 0, 10.9657, 'modelo_final\\usuario_12\\errores.json'),
(64, 6, 'modelo_final\\usuario_6\\faiss.index', '2025-07-06 12:57:42', 3, 0, 18.3765, 'modelo_final\\usuario_6\\errores.json');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personas`
--

CREATE TABLE `personas` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nombre_completo` varchar(100) NOT NULL,
  `codigo_app` varchar(20) NOT NULL,
  `imagen_original` varchar(255) NOT NULL,
  `imagen_mejorada` varchar(255) DEFAULT NULL,
  `imagen_mejorada_listo` tinyint(1) DEFAULT 0,
  `creado_en` datetime DEFAULT current_timestamp(),
  `departamentos_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `personas`
--

INSERT INTO `personas` (`id`, `usuario_id`, `nombre_completo`, `codigo_app`, `imagen_original`, `imagen_mejorada`, `imagen_mejorada_listo`, `creado_en`, `departamentos_id`) VALUES
(100, 6, 'valentino', 'KUQPJWW4', 'usuario_6/valentino.jpg', 'usuario_6/valentino.jpg', 1, '2025-07-06 12:48:30', 10),
(101, 6, 'Marco', 'TN9EFZYH', 'usuario_6/marco1751824126.jpg', 'usuario_6/marco1751824126.jpg', 1, '2025-07-06 12:48:40', 10),
(102, 6, 'Juan Diego', 'GSY6YYFC', 'usuario_6/juan_diego.jpg', 'usuario_6/juan_diego.jpg', 1, '2025-07-06 12:56:57', 13),
(103, 6, 'juan', 'B6XZ8VZE', 'usuario_6/juan.jpg', 'usuario_6/juan.jpg', 1, '2025-07-06 20:34:02', 17),
(104, 6, 'marco', '826YZFJE', 'usuario_6/marco.jpg', 'usuario_6/marco.jpg', 1, '2025-07-07 12:36:50', 10);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `contrasena_hash` text NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `rol` varchar(20) DEFAULT 'admin',
  `imagen` varchar(255) DEFAULT 'default.png'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `contrasena_hash`, `creado_en`, `rol`, `imagen`) VALUES
(3, 'maria', 'maria@ejemplo.com', '$2b$12$jcz7veSQm0lOBKuHmqDi9.Go9bxXDhhgadnQMETkQbz6rdd7JXvdC', '2025-06-21 18:31:30', 'admin', 'default.png'),
(5, 'Lucía', 'lucia@omniface.com', '$2b$12$V6MMjz906x1bJORG4pXcb.At4mToEwLTlvCZnLZK28I7K6Uc1gt3W', '2025-06-21 18:39:04', 'admin', 'default.png'),
(6, 'compañia', 'diego@ejemplo.com', '$2b$12$UXMJ3Rigdfr5N0Hsduflz.hjVwOmoA5l769QqZ/7fpW/q1PYFMm7q', '2025-06-21 19:01:22', 'admin', 'diego.png'),
(7, 'Jose', '1@ejemplo.com', '$2b$12$2TFJ4ili5RcrT/0yi6OWGOAmclqWbwuIjrx43LVbDuo0VBEmUAIv6', '2025-06-21 21:47:31', 'admin', 'default.png'),
(8, 'JUAN DIEGO', 'canaza@ejemplo.com', '$2b$12$1Qgu1d0x8/UNgfKmS97/aeJuQV68faxe0l56nD00cK73wTCQw.yRy', '2025-06-21 23:59:14', 'admin', 'default.png'),
(9, 'juan diego', 'canaza1@ejemplo.com', '$2b$12$bptaSsH93dNWZNCtovbe9edZasZBgaK2yVoOrQFOXdSEcxFJQMe7m', '2025-06-22 04:02:19', 'admin', 'default.png'),
(10, 'jose maria', 'jose@gmail.com', '$2b$12$Mu5Fp36IUFswz.BQKZSW7eIOBzXnhhfOFJdIZiaEKWzL4hU2kRS0a', '2025-06-22 05:05:15', 'admin', 'default.png'),
(11, 'GREGOR MENDEL', 'gregor@gmail.com', '$2b$12$MQzwewjcIc7YnKtjXjlzMuPP14yS8lkyEc4GlQN9ush1NlphMqniO', '2025-06-23 20:21:39', 'admin', 'default.png'),
(12, 'admin', 'admin@ejemplo.com', '$2b$12$.9bBtOIcl45zaEUidP5w6OfoT/IXmDGJbw/laJ1tsIZr9R.QVMvnW', '2025-07-01 05:52:35', 'admin', 'default.png');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario_id` (`usuario_id`,`nombre`);

--
-- Indices de la tabla `modelos_generados`
--
ALTER TABLE `modelos_generados`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `personas`
--
ALTER TABLE `personas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `fk_departamentos` (`departamentos_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `modelos_generados`
--
ALTER TABLE `modelos_generados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT de la tabla `personas`
--
ALTER TABLE `personas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `departamentos`
--
ALTER TABLE `departamentos`
  ADD CONSTRAINT `departamentos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `modelos_generados`
--
ALTER TABLE `modelos_generados`
  ADD CONSTRAINT `modelos_generados_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `personas`
--
ALTER TABLE `personas`
  ADD CONSTRAINT `fk_departamentos` FOREIGN KEY (`departamentos_id`) REFERENCES `departamentos` (`id`),
  ADD CONSTRAINT `personas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
