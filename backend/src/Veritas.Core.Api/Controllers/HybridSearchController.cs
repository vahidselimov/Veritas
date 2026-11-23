using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Veritas.Core.Domain.Interfaces;

namespace Veritas.Core.Api.Controllers
{
    public class SearchRequest
    {
        public string Query { get; set; } = string.Empty;
        public float[]? Embedding { get; set; }
        public double DenseWeight { get; set; } = 0.65;
        public int TopK { get; set; } = 40;
    }

    [ApiController]
    [Route("api/v1/[controller]")]
    public class HybridSearchController : ControllerBase
    {
        [HttpPost]
        public ActionResult<IEnumerable<SearchCandidate>> Search([FromBody] SearchRequest request)
        {
            // Fallback & placeholder for Week 3 Hybrid Retrieval
            var results = new List<SearchCandidate>();
            return Ok(results);
        }
    }
}
