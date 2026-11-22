import { season } from './build';

const C: [string, string] = ['#006BB6', '#F58426'];
const K = (y: number, r: string) => season('nyk', 'New York', 'Knicks', y, C, r);

export const knicks = [
  K(1970, `
    Willis Reed|C|92|27|big
    Walt Frazier|PG|92|24|twoway
    Dave DeBusschere|PF|86|29|defender
    Bill Bradley|SF|82|26|shooter
    Dick Barnett|SG|80|33|scorer
    Cazzie Russell|SF|78|25|scorer
    Dave Stallworth|PF|74|28|big
    Mike Riordan|SG|72|24|defender
  `),
  K(1973, `
    Walt Frazier|PG|93|27|twoway
    Earl Monroe|SG|87|28|scorer
    Dave DeBusschere|PF|85|32|defender
    Willis Reed|C|84|30|big|40
    Jerry Lucas|C/PF|82|32|point
    Bill Bradley|SF|82|29|shooter
    Phil Jackson|PF|72|27|defender
    Dean Meminger|PG|72|25|defender
  `),
  K(1985, `
    Bernard King|SF|92|28|scorer|40
    Bill Cartwright|C|78|27|big
    Pat Cummings|PF|76|28|big
    Rory Sparrow|PG|75|26|playmaker
    Trent Tucker|SG|74|25|shooter
    Darrell Walker|SG|73|23|defender
    Louis Orr|SF|73|26|wing3d
  `),
  K(1990, `
    Patrick Ewing|C|93|27|big
    Charles Oakley|PF|80|26|big
    Gerald Wilkins|SG|78|26|slasher
    Mark Jackson|PG|78|24|playmaker
    Kiki Vandeweghe|SF|78|31|scorer
    Johnny Newman|SF|76|26|scorer
    Maurice Cheeks|PG|74|33|defender
    Kenny Walker|PF|72|25|slasher
  `),
  K(1994, `
    Patrick Ewing|C|94|31|big
    John Starks|SG|82|28|scorer
    Charles Oakley|PF|82|30|big
    Derek Harper|PG|79|32|defender
    Anthony Mason|PF|79|27|defender
    Charles Smith|PF|76|28|big
    Hubert Davis|SG|74|23|shooter
    Greg Anthony|PG|72|26|defender
  `),
  K(1999, `
    Patrick Ewing|C|85|36|big|40
    Allan Houston|SG|84|28|shooter
    Latrell Sprewell|SG/SF|84|28|slasher
    Larry Johnson|PF|80|29|scorer
    Marcus Camby|C/PF|80|24|rim
    Kurt Thomas|PF|75|26|big
    Charlie Ward|PG|74|28|playmaker
    Chris Childs|PG|73|31|defender
  `),
  K(2013, `
    Carmelo Anthony|SF/PF|92|28|scorer
    Tyson Chandler|C|84|30|rim
    J.R. Smith|SG|80|27|scorer
    Raymond Felton|PG|78|28|playmaker
    Amar'e Stoudemire|PF|78|30|slasher|40
    Iman Shumpert|SG|75|22|defender
    Jason Kidd|PG|74|39|playmaker
    Steve Novak|SF|74|29|shooter
    Pablo Prigioni|PG|72|35|playmaker
  `),
  K(2024, `
    Jalen Brunson|PG|92|27|scorer
    Julius Randle|PF|86|29|scorer|55
    OG Anunoby|SF/PF|85|26|defender
    Josh Hart|SG/SF|82|29|twoway
    Donte DiVincenzo|SG|81|27|shooter
    Isaiah Hartenstein|C|80|25|big
    Mitchell Robinson|C|78|25|rim|35
    Miles McBride|PG|76|23|defender
    Precious Achiuwa|PF/C|74|24|rim
  `),
];
