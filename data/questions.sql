/*
 Navicat Premium Dump SQL

 Source Server         : LOCALHOST
 Source Server Type    : MySQL
 Source Server Version : 80403 (8.4.3)
 Source Host           : localhost:3306
 Source Schema         : ncfel2

 Target Server Type    : MySQL
 Target Server Version : 80403 (8.4.3)
 File Encoding         : 65001

 Date: 10/02/2026 20:07:30
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for questions
-- ----------------------------
DROP TABLE IF EXISTS `questions`;
CREATE TABLE `questions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `courseid` tinyint(1) NULL DEFAULT NULL,
  `unitid` tinyint(1) NULL DEFAULT NULL,
  `QuestionRef` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `Question` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `uploadPermitted` tinyint UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = no upload permitted 1 = uploads permitted',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 99 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
