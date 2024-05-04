import { serveFile } from "#http/file_server";
import { contentType } from "#media_types"
import { extname } from "#path";
import importmap from '#importmap' assert { type: 'json' };

const PORT = Deno.env.get('PORT');

function onListen({ port, hostname }: Deno.ServeOptions) {
  try {
    console.info(`Server started at http://${hostname}:${port}`);
  } catch (error) {
    console.error(error.message || error.toString());
    throw error;
  }
}

async function errorResponse(error: Error) {
  console.error(error.message || error.toString());

  const html = await Deno.readTextFile("./www/404.html");

  return new Response(html, { status: 404, headers: { "content-type": "text/html" } });
}

type Resource = keyof typeof importmap['imports'];

async function requestHandler(request: Request) {
  try {
    const { pathname } = new URL(request.url);

    const pathnameHandler = pathname === '/' ? "#home" : pathname.replace('/', '#');

    if (pathnameHandler in importmap.imports) {
      const resourcePath = importmap.imports[pathnameHandler as Resource];

      if (resourcePath.startsWith('./')) {
        return serveFile(request, resourcePath)
      }

      const resourceURL = new URL(resourcePath, import.meta.url).toString();

      const response =  await fetch(resourceURL)

      const updatedResponse = new Response(response.body)
      const responseContentType = contentType(extname(resourceURL)) || contentType("text/html");
      updatedResponse.headers.set("content-type", responseContentType)
      return updatedResponse
    }

    return errorResponse(new Error(`requested resource at ${pathname} is not found`));
  } catch (error) {
    return errorResponse(error);
  }
}

const serverOptions: Deno.ServeOptions = {
  onListen,
  port: PORT ? parseInt(PORT, 10) : 1729
}

if (import.meta?.main) {
  Deno.serve(serverOptions, requestHandler);
}
