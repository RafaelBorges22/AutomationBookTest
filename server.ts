// server.ts

import express from "express";
import cors from "cors";
import SwaggerParser from "@apidevtools/swagger-parser";
import path from "path";

import { generateTestCases } from "./components/scenarioGenerator.ts";
import { writeExcel } from "./components/excelWrite.ts";

import type { MethodConfig } from "./components/types.ts";

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static("public"));

app.post("/load-swagger", async (req, res) => {
  try {

    const { swaggerFile } = req.body;

    const swaggerPath =
      `./documentation/${swaggerFile}`;

    const api: any =
      await SwaggerParser
        .dereference(swaggerPath);

    const endpoints = [];

    for (
      const [pathName, methods]
      of Object.entries(api.paths)
    ) {

      for (
        const [method]
        of Object.entries(methods as any)
      ) {

        if (
          [
            "parameters",
            "summary",
            "description",
            "$ref",
            "servers"
          ].includes(method)
        ) {
          continue;
        }

        endpoints.push({
          path: pathName,
          method: method.toUpperCase()
        });
      }
    }

    return res.json({
      success: true,
      endpoints
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error
    });
  }
});

app.post("/generate", async (req, res) => {
  try {

    const {
      swaggerFile,
      userEmail,
      methodConfigs
    } = req.body;

    const swaggerPath =
      `./documentation/${swaggerFile}`;

    const api: any =
      await SwaggerParser
        .dereference(swaggerPath);

    const configMap =
      new Map<string, MethodConfig>();

    for (const config of methodConfigs) {

      const key =
        `${config.method}:${config.path}`;

      configMap.set(key, config);
    }

    const testCases =
      generateTestCases(
        api,
        configMap,
        userEmail
      );

    console.log(
      `Gerando ${testCases.length} cenários`
    );

    await writeExcel(testCases);

    const excelPath =
      path.resolve(
        "./Caderno_Casos_de_Testes.xlsx"
      );

    return res.download(
      excelPath,
      "Caderno_Casos_de_Testes.xlsx"
    );

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error
    });
  }
});

app.listen(3000, () => {
  console.log("");
  console.log("🚀 Servidor iniciado");
  console.log(
    "http://localhost:3000"
  );
});