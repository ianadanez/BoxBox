import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { engine } from "./engine";
import { GrandPrix, Prediction, OfficialResult, GpScore } from "../../types";

admin.initializeApp();

// La función processRaceResults ha sido eliminada ya que no estaba en uso.
