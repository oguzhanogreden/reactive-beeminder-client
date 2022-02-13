import { GoalRateUnits } from "./client";

type DataPointResponse = {
    timestamp: number;
    value: number;
};

 export type GoalResponse = {
    slug: string;
    rate: number;
    runits: GoalRateUnits;
    title: string;
    gunits: string;
    datapoints: DataPointResponse[];
};


export type UserResponse = {
    goals: string[];
};


export { };
