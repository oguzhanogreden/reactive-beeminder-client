// Use with node: uncomment this 
// var _beeminder = require("beeminder");
import produce, { enableAllPlugins } from "immer";
import {
  BehaviorSubject,
  map, Observable, ReplaySubject, shareReplay,
  Subject
} from "rxjs";
import { scan } from "rxjs/operators";
import { GoalResponse, UserResponse } from "./api";

enableAllPlugins();

export type Goal = {
  slug: string;
  rate: GoalRate;
  title: string;
  category?: string;
  dataPoints: {
    timestamp: number,
    value: number,
  }[]
};

export type GoalRate = {
  value: number;
  unit: GoalRateUnits;
  gunit: string;
};
export type GoalRateUnits = "y" | "m" | "w" | "d" | "h";

export type User = {
  username: string
  goals: string[],
}

type ClientConstructor = {
  token: string;
  client: (token: string) => IClient;
};

// TODO: Shouldn't even exist!
// Goals are separately represented and there's one user already.
// But let's exercise:
const replaceUser = produce((draft: User, newUser: User) => {
  draft.goals = newUser.goals;
  draft.username = newUser.username;
})

export class Client {
  private _clientFactory: (token: string) => IClient;
  private _client = new BehaviorSubject<IClient | null>(null);
  private _userDataStream = new Subject<UserResponse>();
  private _goalDataStream = new ReplaySubject<GoalResponse>();

  userDataStream$: Observable<User> = this._userDataStream.pipe(
    scan((user, newValue) => replaceUser(user, newValue), { 'goals': [], username: '' } as User),
    shareReplay(1)
  );
  goalDataStream$: Observable<Goal> = this._goalDataStream.pipe(
    map((response) => {
      const title = response.title;

      return {
        rate: {
          value: response.rate,
          unit: response.runits,
          gunit: response.gunits,
        },
        slug: response.slug,
        title: title,
        // category: categorizeGoal(title, categories),
        dataPoints: response.datapoints
      } as Goal;
    }),
    shareReplay(1)
  );


  constructor(params: ClientConstructor) {
    const { token, client } = params;
    this._clientFactory = client;

    this._client.next(this._clientFactory(token));
  }

  setToken(apiToken: string) {
    this._client.next(this._clientFactory(apiToken));
    this.getUser();
  }

  getUser() {
    this._client.getValue()?.getUser(this.getUserCallback.bind(this));
  }

  getGoalData(slug: string) {
    this._client.getValue()?.getGoal(slug, this.getGoalDataCallback.bind(this));
  }

  // filterByCategory(category: GoalCategory) {
  //   return this.goalDataStream$.pipe(
  // 	groupBy((x) => x.category),
  // 	mergeMap((group) => {
  // 	  return group.pipe(
  // 		tap(x => console.log),
  // 		scan((acc, cur) => [...acc, 1], [0]),
  // 		tap(x => console.log),
  // 		// scan((total, goal) => total + goal.rate.value, 0));
  // 	  )
  // 	  })
  //   )
  // }

  private getGoalDataCallback(err: any, result: GoalResponse) {
    // TODO: Check if this is bound?

    // TODO: Should be in the reactive code?
    if (err) {
      throw new Error("Can't get goal.");
    }

    this._goalDataStream.next(result);
  }

  private getUserCallback(err: any, result: UserResponse) {
    // TODO: Check if this is bound?

    // TODO: Should be in the reactive code?
    if (err) {
      throw new Error("While getting data.");
    }

    this._userDataStream.next(result);
  }
}

// TODO: This contract came about to appease node.js client.
//	   It feels clunky.
export type Callback<T> = (err: any, result: T) => void;

//   type GoalCategory = {
// 	titleContains: string;
// 	name: string;
//   };

//   const categories: GoalCategory[] = [
// 	{
// 	  titleContains: "🎯🤓🧑🏽‍💻⏲⬆️",
// 	  name: "/d",
// 	},
// 	{
// 	  titleContains: "🎯🐝🚀⏲⬆️",
// 	  name: "/pb-i-p",
// 	},
// 	{
// 	  titleContains: "🎯🐝🎧⏲⬆️",
// 	  name: "/pb-push",
// 	},
//   ];

//   function categorizeGoal(title: string, categories: GoalCategory[]): string {
// 	const categoryMarkers = categories.map((x) => x.titleContains);

// 	return categories[categoryMarkers.indexOf(title)]?.name;
//   }

export type IClient = {
  getUser: (cb: Callback<UserResponse>) => void;
  getGoal: (goalName: string, cb: Callback<GoalResponse>) => void;
};
