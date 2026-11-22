import { season } from './build';

const C: [string, string] = ['#007A33', '#BA9653'];
const B = (y: number, r: string) => season('bos', 'Boston', 'Celtics', y, C, r);

export const celtics = [
  B(1962, `
    Bill Russell|C|96|28|rim
    Bob Cousy|PG|88|33|playmaker
    Tom Heinsohn|PF/SF|87|27|scorer
    Sam Jones|SG|87|28|scorer
    Frank Ramsey|SF/SG|82|30|scorer
    Tom Sanders|PF|80|23|defender
    K.C. Jones|PG|78|29|defender
    Jim Loscutoff|PF|72|31|defender
  `),
  B(1969, `
    John Havlicek|SF/SG|92|28|twoway
    Bill Russell|C|90|34|rim
    Sam Jones|SG|85|35|scorer
    Bailey Howell|PF|84|32|scorer
    Don Nelson|PF/SF|78|28|stretch
    Larry Siegfried|SG/PG|77|29|defender
    Tom Sanders|PF|76|30|defender
    Emmette Bryant|PG|74|30|defender
  `),
  B(1974, `
    John Havlicek|SF/SG|91|33|twoway
    Dave Cowens|C|91|25|big
    Jo Jo White|PG|87|27|scorer
    Paul Silas|PF|82|30|big
    Don Chaney|SG|78|27|defender
    Paul Westphal|SG|76|23|scorer
    Don Nelson|PF/SF|76|33|stretch
    Steve Kuberski|PF|70|26|big
  `),
  B(1984, `
    Larry Bird|SF/PF|97|27|scorer
    Kevin McHale|PF|88|26|big
    Robert Parish|C|87|30|big
    Dennis Johnson|PG/SG|83|29|defender
    Cedric Maxwell|SF|80|28|twoway
    Gerald Henderson|PG|78|28|scorer
    Danny Ainge|SG|76|24|shooter
    M.L. Carr|SF|72|33|defender
  `),
  B(1986, `
    Larry Bird|SF/PF|99|29|scorer
    Kevin McHale|PF|92|28|big
    Robert Parish|C|87|32|big
    Dennis Johnson|PG/SG|84|31|defender
    Danny Ainge|SG|82|26|shooter
    Bill Walton|C|80|33|point|30
    Scott Wedman|SF|74|33|shooter
    Jerry Sichting|PG|72|29|shooter
  `),
  B(2002, `
    Paul Pierce|SF|90|24|scorer
    Antoine Walker|PF|86|25|point
    Kenny Anderson|PG|78|31|playmaker
    Rodney Rogers|PF|76|30|scorer
    Eric Williams|SF|74|29|defender
    Tony Delk|SG|74|28|scorer
    Erick Strickland|SG|70|28|scorer
    Vitaly Potapenko|C|70|26|big
  `),
  B(2008, `
    Kevin Garnett|PF|93|31|unicorn
    Paul Pierce|SF|91|30|scorer
    Ray Allen|SG|87|32|shooter
    Rajon Rondo|PG|81|21|playmaker
    Kendrick Perkins|C|77|23|rim
    James Posey|SF|77|31|wing3d
    Eddie House|PG|74|29|shooter
    Leon Powe|PF|72|24|big
    P.J. Brown|PF/C|72|38|defender
  `),
  B(2022, `
    Jayson Tatum|SF/PF|92|24|twoway
    Jaylen Brown|SG/SF|87|25|slasher
    Marcus Smart|PG/SG|83|28|defender
    Al Horford|C/PF|82|35|stretch
    Robert Williams III|C|82|24|rim|40
    Derrick White|PG/SG|80|27|wing3d
    Grant Williams|PF|76|23|stretch
    Payton Pritchard|PG|74|24|shooter
  `),
  B(2024, `
    Jayson Tatum|SF/PF|94|26|twoway
    Jaylen Brown|SG/SF|89|27|slasher
    Kristaps Porziņģis|C/PF|87|28|stretch|45
    Jrue Holiday|PG/SG|86|33|defender
    Derrick White|PG/SG|86|29|wing3d
    Al Horford|C/PF|80|37|stretch
    Payton Pritchard|PG|78|26|shooter
    Sam Hauser|SF|76|26|shooter
    Luke Kornet|C|72|28|rim
  `),
];
