/* eslint-disable node/no-extraneous-import */
require('dotenv').config();
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import typeDefs from './api/schemas/index';
import resolvers from './api/resolvers/index';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import {notFound, errorHandler} from './middlewares';
import authenticate from './functions/authenticate';
import {MyContext} from './interfaces/MyContext';
import {createRateLimitRule} from 'graphql-rate-limit';
import {shield} from 'graphql-shield';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {applyMiddleware} from 'graphql-middleware';

const app = express();

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);
app.use(cors<cors.CorsRequest>());
app.use(express.json());

(async () => {
  try {
    // TODO Create a rate limit rule instance
    const rateLimitRule = createRateLimitRule({
      identifyContext: (ctx) => ctx.id,
    });
    // TODO Create a permissions object

    const permissions = shield({
      Mutation: {
        login: rateLimitRule({window: '1s', max: 5}),
      },
    });
    // TODO Apply the permissions object to the schema
    // remember to change the typeDefs and resolvers to a schema object
    const schema = applyMiddleware(
      makeExecutableSchema({
        typeDefs,
        resolvers,
      }),
      permissions
    );

    app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
      })
    );

    const server = new ApolloServer<MyContext>({
      schema,
      introspection: true,
      plugins: [
        process.env.NODE_ENV === 'production'
          ? ApolloServerPluginLandingPageProductionDefault({
              embed: true as false,
            })
          : ApolloServerPluginLandingPageLocalDefault(),
      ],
      includeStacktraceInErrorResponses: false,
    });
    await server.start();

    app.use(
      '/graphql',
      express.json(),
      cors<cors.CorsRequest>(),
      expressMiddleware(server, {
        context: async ({req}) => authenticate(req),
      })
    );

    app.use(notFound);
    app.use(errorHandler);
  } catch (error) {
    console.log(error);
  }
})();

export default app;
