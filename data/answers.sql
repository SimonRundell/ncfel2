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

 Date: 10/02/2026 20:14:11
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for answers
-- ----------------------------
DROP TABLE IF EXISTS `answers`;
CREATE TABLE `answers`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `activityId` int NOT NULL,
  `studentId` int NOT NULL,
  `questionId` int NOT NULL,
  `answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `outcome` enum('ACHIEVED','NOT ACHIEVED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'NOT ACHIEVED',
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `references` json NULL COMMENT 'json of references',
  `status` enum('NOTSET','INPROGRESS','SUBMITTED','INMARKING','REDOING','RESUBMITTED','INREMARKING','PASSED','NOTPASSED','DISCONTINUED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'NOTSET',
  `updatedAt` datetime NULL DEFAULT NULL,
  `fileUploads` json NULL COMMENT 'json of fileuploads',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_answers_activity_student_question`(`activityId` ASC, `studentId` ASC, `questionId` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 200 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
